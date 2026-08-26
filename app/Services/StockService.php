<?php

namespace App\Services;

use App\Enums\MotivoMovimientoStock;
use App\Exceptions\StockInsuficienteException;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Validación optimista (sin lock) para UX antes de intentar escribir: por cada item
     * del carrito, devuelve los que no tienen stock suficiente. Array vacío = todo disponible.
     *
     * $items tiene el shape que ya usa PedidoController::store: [['producto_id' => int, 'cantidad' => int], ...],
     * con una clave 'variante_id' opcional: si el item la trae, se chequea el stock de ESA
     * ProductoVariante en vez del producto (productos.stock queda obsoleto para productos con
     * variantes, ver Producto::tieneStockDisponible).
     */
    public function validarDisponibilidad(array $items): array
    {
        $productos = Producto::whereIn('id', array_column($items, 'producto_id'))
            ->get()
            ->keyBy('id');

        $varianteIds = array_filter(array_column($items, 'variante_id'));
        $variantes = ProductoVariante::whereIn('id', $varianteIds)->get()->keyBy('id');

        $faltantes = [];

        foreach ($items as $item) {
            $producto = $productos->get($item['producto_id']);
            $cantidad = (int) $item['cantidad'];
            $varianteId = $item['variante_id'] ?? null;

            if ($producto === null) {
                continue;
            }

            if ($varianteId !== null) {
                $variante = $variantes->get($varianteId);

                if ($variante !== null && $variante->tieneStockDisponible($cantidad)) {
                    continue;
                }

                $faltantes[] = [
                    'producto_id' => $producto->id,
                    'variante_id' => $varianteId,
                    'cantidad' => $cantidad,
                    'stock_disponible' => $variante !== null ? max(0, $variante->stock) : 0,
                ];

                continue;
            }

            if ($producto->tieneStockDisponible($cantidad)) {
                continue;
            }

            $faltantes[] = [
                'producto_id' => $producto->id,
                'cantidad' => $cantidad,
                'stock_disponible' => max(0, $producto->stock),
            ];
        }

        return $faltantes;
    }

    /**
     * Descuenta stock por cada item del pedido dentro de una transacción con lock pesimista
     * por fila (producto o variante, según corresponda). Si algún item no tiene stock
     * suficiente (chequeado de nuevo bajo el lock, no confiando en la validación optimista
     * previa), aborta todo el descuento.
     *
     * @throws StockInsuficienteException
     */
    public function descontar(Pedido $pedido): void
    {
        DB::transaction(function () use ($pedido) {
            $items = $this->itemsOrdenadosParaLock($pedido);

            foreach ($items as $item) {
                if ($item->producto_variante_id !== null) {
                    $this->descontarVariante($pedido, $item);

                    continue;
                }

                $this->descontarProducto($pedido, $item);
            }
        });
    }

    /**
     * Repone stock por cada item del pedido (contraparte de descontar, ej. al cancelar).
     * Idempotente: si ya existe un movimiento pedido_cancelado para este pedido, no hace
     * nada. Esto protege contra una doble ejecución accidental (ej. reponer() llamado dos
     * veces sobre el mismo pedido); no reemplaza la validación de transición de estado
     * (que un pedido solo puede cancelarse una vez), responsabilidad de la Fase 4.
     *
     * Repone a la misma fila (producto o variante) que descontó el movimiento original: si
     * el item tenía producto_variante_id, la reposición va a esa variante, no al producto.
     */
    public function reponer(Pedido $pedido): void
    {
        DB::transaction(function () use ($pedido) {
            $yaRepuesto = MovimientoStock::where('pedido_id', $pedido->id)
                ->where('motivo', MotivoMovimientoStock::PedidoCancelado)
                ->exists();

            if ($yaRepuesto) {
                return;
            }

            $items = $this->itemsOrdenadosParaLock($pedido);

            foreach ($items as $item) {
                if ($item->producto_variante_id !== null) {
                    $this->reponerVariante($pedido, $item);

                    continue;
                }

                $this->reponerProducto($pedido, $item);
            }
        });
    }

    /**
     * Orden estable (producto_id, luego producto_variante_id) para que dos transacciones
     * concurrentes que tocan los mismos productos/variantes siempre pidan los locks en el
     * mismo orden y no se deadlockeen entre sí.
     */
    private function itemsOrdenadosParaLock(Pedido $pedido)
    {
        return $pedido->items()
            ->with(['producto', 'productoVariante'])
            ->get()
            ->sortBy([
                ['producto_id', 'asc'],
                ['producto_variante_id', 'asc'],
            ]);
    }

    private function descontarProducto(Pedido $pedido, PedidoItem $item): void
    {
        $producto = Producto::where('id', $item->producto_id)->lockForUpdate()->first();

        if ($producto === null || $producto->tieneStockIlimitado()) {
            return;
        }

        if (! $producto->tieneStockDisponible($item->cantidad)) {
            throw new StockInsuficienteException($producto->id, $item->cantidad, max(0, $producto->stock));
        }

        $producto->stock -= $item->cantidad;
        $producto->save();

        MovimientoStock::create([
            'producto_id' => $producto->id,
            'pedido_id' => $pedido->id,
            'cantidad' => -$item->cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCreado,
            'stock_resultante' => $producto->stock,
        ]);
    }

    private function descontarVariante(Pedido $pedido, PedidoItem $item): void
    {
        $variante = ProductoVariante::where('id', $item->producto_variante_id)->lockForUpdate()->first();

        if ($variante === null || $variante->tieneStockIlimitado()) {
            return;
        }

        if (! $variante->tieneStockDisponible($item->cantidad)) {
            throw new StockInsuficienteException(
                $item->producto_id,
                $item->cantidad,
                max(0, $variante->stock),
                $variante->id
            );
        }

        $variante->stock -= $item->cantidad;
        $variante->save();

        MovimientoStock::create([
            'producto_id' => $item->producto_id,
            'producto_variante_id' => $variante->id,
            'pedido_id' => $pedido->id,
            'cantidad' => -$item->cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCreado,
            'stock_resultante' => $variante->stock,
        ]);
    }

    private function reponerProducto(Pedido $pedido, PedidoItem $item): void
    {
        $producto = Producto::where('id', $item->producto_id)->lockForUpdate()->first();

        if ($producto === null || $producto->tieneStockIlimitado()) {
            return;
        }

        $producto->stock += $item->cantidad;
        $producto->save();

        MovimientoStock::create([
            'producto_id' => $producto->id,
            'pedido_id' => $pedido->id,
            'cantidad' => $item->cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCancelado,
            'stock_resultante' => $producto->stock,
        ]);
    }

    private function reponerVariante(Pedido $pedido, PedidoItem $item): void
    {
        $variante = ProductoVariante::where('id', $item->producto_variante_id)->lockForUpdate()->first();

        if ($variante === null || $variante->tieneStockIlimitado()) {
            return;
        }

        $variante->stock += $item->cantidad;
        $variante->save();

        MovimientoStock::create([
            'producto_id' => $item->producto_id,
            'producto_variante_id' => $variante->id,
            'pedido_id' => $pedido->id,
            'cantidad' => $item->cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCancelado,
            'stock_resultante' => $variante->stock,
        ]);
    }
}
