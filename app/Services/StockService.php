<?php

namespace App\Services;

use App\Enums\MotivoMovimientoStock;
use App\Exceptions\StockInsuficienteException;
use App\Models\MovimientoStock;
use App\Models\Pedido;
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
            $operaciones = $this->operacionesOrdenadasParaLock($pedido);

            foreach ($operaciones as $operacion) {
                if ($operacion['producto_variante_id'] !== null) {
                    $this->descontarVariante($pedido, $operacion['producto_id'], $operacion['producto_variante_id'], $operacion['cantidad']);

                    continue;
                }

                $this->descontarProducto($pedido, $operacion['producto_id'], $operacion['cantidad']);
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

            $operaciones = $this->operacionesOrdenadasParaLock($pedido);

            foreach ($operaciones as $operacion) {
                if ($operacion['producto_variante_id'] !== null) {
                    $this->reponerVariante($pedido, $operacion['producto_id'], $operacion['producto_variante_id'], $operacion['cantidad']);

                    continue;
                }

                $this->reponerProducto($pedido, $operacion['producto_id'], $operacion['cantidad']);
            }
        });
    }

    /**
     * Aplana los items del pedido en operaciones de stock {producto_id,
     * producto_variante_id, cantidad} y las ordena de forma estable (producto_id,
     * luego producto_variante_id) para que dos transacciones concurrentes que tocan
     * los mismos productos/variantes siempre pidan los locks en el mismo orden y no
     * se deadlockeen entre sí.
     *
     * Una línea de producto suelto es 1 operación (como siempre). Una línea de combo
     * (`combo_id` seteado) se expande en N operaciones, una por cada componente de su
     * snapshot `combo_items_seleccionados` (ver PedidoController::store), con la
     * cantidad total ya calculada (cantidad_por_combo * cantidad del combo vendido).
     */
    private function operacionesOrdenadasParaLock(Pedido $pedido): \Illuminate\Support\Collection
    {
        $items = $pedido->items()->with(['producto', 'productoVariante'])->get();

        $operaciones = collect();

        foreach ($items as $item) {
            if ($item->combo_id !== null) {
                foreach ($item->combo_items_seleccionados ?? [] as $componente) {
                    $operaciones->push([
                        'producto_id' => $componente['producto_id'],
                        'producto_variante_id' => $componente['producto_variante_id'] ?? null,
                        'cantidad' => (int) $componente['cantidad_total'],
                    ]);
                }

                continue;
            }

            $operaciones->push([
                'producto_id' => $item->producto_id,
                'producto_variante_id' => $item->producto_variante_id,
                'cantidad' => (int) $item->cantidad,
            ]);
        }

        return $operaciones->sortBy([
            ['producto_id', 'asc'],
            ['producto_variante_id', 'asc'],
        ])->values();
    }

    private function descontarProducto(Pedido $pedido, int $productoId, int $cantidad): void
    {
        $producto = Producto::where('id', $productoId)->lockForUpdate()->first();

        if ($producto === null || $producto->tieneStockIlimitado()) {
            return;
        }

        if (! $producto->tieneStockDisponible($cantidad)) {
            throw new StockInsuficienteException($producto->id, $cantidad, max(0, $producto->stock));
        }

        $producto->stock -= $cantidad;
        $producto->save();

        MovimientoStock::create([
            'producto_id' => $producto->id,
            'pedido_id' => $pedido->id,
            'cantidad' => -$cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCreado,
            'stock_resultante' => $producto->stock,
        ]);
    }

    private function descontarVariante(Pedido $pedido, int $productoId, int $varianteId, int $cantidad): void
    {
        $variante = ProductoVariante::where('id', $varianteId)->lockForUpdate()->first();

        if ($variante === null || $variante->tieneStockIlimitado()) {
            return;
        }

        if (! $variante->tieneStockDisponible($cantidad)) {
            throw new StockInsuficienteException(
                $productoId,
                $cantidad,
                max(0, $variante->stock),
                $variante->id
            );
        }

        $variante->stock -= $cantidad;
        $variante->save();

        MovimientoStock::create([
            'producto_id' => $productoId,
            'producto_variante_id' => $variante->id,
            'pedido_id' => $pedido->id,
            'cantidad' => -$cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCreado,
            'stock_resultante' => $variante->stock,
        ]);
    }

    private function reponerProducto(Pedido $pedido, int $productoId, int $cantidad): void
    {
        $producto = Producto::where('id', $productoId)->lockForUpdate()->first();

        if ($producto === null || $producto->tieneStockIlimitado()) {
            return;
        }

        $producto->stock += $cantidad;
        $producto->save();

        MovimientoStock::create([
            'producto_id' => $producto->id,
            'pedido_id' => $pedido->id,
            'cantidad' => $cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCancelado,
            'stock_resultante' => $producto->stock,
        ]);
    }

    private function reponerVariante(Pedido $pedido, int $productoId, int $varianteId, int $cantidad): void
    {
        $variante = ProductoVariante::where('id', $varianteId)->lockForUpdate()->first();

        if ($variante === null || $variante->tieneStockIlimitado()) {
            return;
        }

        $variante->stock += $cantidad;
        $variante->save();

        MovimientoStock::create([
            'producto_id' => $productoId,
            'producto_variante_id' => $variante->id,
            'pedido_id' => $pedido->id,
            'cantidad' => $cantidad,
            'motivo' => MotivoMovimientoStock::PedidoCancelado,
            'stock_resultante' => $variante->stock,
        ]);
    }
}
