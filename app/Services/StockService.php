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
     * Ajusta el stock cuando se edita un pedido ya descontado: compara las operaciones
     * de antes y después de la edición (ver operacionesDe()), y por cada producto/variante
     * descuenta el aumento o repone la reducción — solo la diferencia, no todo de nuevo.
     * Los movimientos quedan como `ajuste_manual` ligados al pedido, así no se mezclan
     * con la reposición por cancelación (que el detalle del pedido lista aparte).
     *
     * Debe correr dentro de la transacción de la edición: si el aumento no tiene stock
     * suficiente lanza StockInsuficienteException y el rollback deshace toda la edición.
     *
     * @param  array<int, array{producto_id: int, producto_variante_id: ?int, cantidad: int}>  $antes
     * @param  array<int, array{producto_id: int, producto_variante_id: ?int, cantidad: int}>  $despues
     *
     * @throws StockInsuficienteException
     */
    public function ajustarPorEdicion(Pedido $pedido, array $antes, array $despues): void
    {
        $totalizar = function (array $operaciones): array {
            $totales = [];

            foreach ($operaciones as $operacion) {
                // Producto borrado del catálogo: no hay stock que mover.
                if ($operacion['producto_id'] === null) {
                    continue;
                }

                $clave = $operacion['producto_id'].':'.($operacion['producto_variante_id'] ?? 'null');

                $totales[$clave] ??= [
                    'producto_id' => $operacion['producto_id'],
                    'producto_variante_id' => $operacion['producto_variante_id'],
                    'cantidad' => 0,
                ];
                $totales[$clave]['cantidad'] += (int) $operacion['cantidad'];
            }

            return $totales;
        };

        $totalesAntes = $totalizar($antes);
        $totalesDespues = $totalizar($despues);

        $diferencias = collect(array_keys($totalesAntes + $totalesDespues))
            ->map(function (string $clave) use ($totalesAntes, $totalesDespues) {
                $base = $totalesDespues[$clave] ?? $totalesAntes[$clave];

                return [
                    'producto_id' => $base['producto_id'],
                    'producto_variante_id' => $base['producto_variante_id'],
                    'delta' => ($totalesDespues[$clave]['cantidad'] ?? 0) - ($totalesAntes[$clave]['cantidad'] ?? 0),
                ];
            })
            ->filter(fn (array $diferencia) => $diferencia['delta'] !== 0)
            // Mismo orden estable que operacionesOrdenadasParaLock() para no deadlockear.
            ->sortBy([['producto_id', 'asc'], ['producto_variante_id', 'asc']])
            ->values();

        if ($diferencias->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($pedido, $diferencias) {
            foreach ($diferencias as $diferencia) {
                $varianteId = $diferencia['producto_variante_id'];
                $cantidad = abs($diferencia['delta']);

                if ($diferencia['delta'] > 0) {
                    $varianteId !== null
                        ? $this->descontarVariante($pedido, $diferencia['producto_id'], $varianteId, $cantidad, MotivoMovimientoStock::AjusteManual)
                        : $this->descontarProducto($pedido, $diferencia['producto_id'], $cantidad, MotivoMovimientoStock::AjusteManual);

                    continue;
                }

                $varianteId !== null
                    ? $this->reponerVariante($pedido, $diferencia['producto_id'], $varianteId, $cantidad, MotivoMovimientoStock::AjusteManual)
                    : $this->reponerProducto($pedido, $diferencia['producto_id'], $cantidad, MotivoMovimientoStock::AjusteManual);
            }
        });
    }

    /**
     * Operaciones de stock {producto_id, producto_variante_id, cantidad} del pedido tal
     * como está ahora (combos expandidos en sus componentes). Es la "foto" que se toma
     * antes y después de editarlo para pasarle a ajustarPorEdicion().
     *
     * @return array<int, array{producto_id: int, producto_variante_id: ?int, cantidad: int}>
     */
    public function operacionesDe(Pedido $pedido): array
    {
        return $this->operacionesOrdenadasParaLock($pedido)->all();
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

    private function descontarProducto(Pedido $pedido, int $productoId, int $cantidad, MotivoMovimientoStock $motivo = MotivoMovimientoStock::PedidoCreado): void
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
            'motivo' => $motivo,
            'stock_resultante' => $producto->stock,
        ]);
    }

    private function descontarVariante(Pedido $pedido, int $productoId, int $varianteId, int $cantidad, MotivoMovimientoStock $motivo = MotivoMovimientoStock::PedidoCreado): void
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
            'motivo' => $motivo,
            'stock_resultante' => $variante->stock,
        ]);
    }

    private function reponerProducto(Pedido $pedido, int $productoId, int $cantidad, MotivoMovimientoStock $motivo = MotivoMovimientoStock::PedidoCancelado): void
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
            'motivo' => $motivo,
            'stock_resultante' => $producto->stock,
        ]);
    }

    private function reponerVariante(Pedido $pedido, int $productoId, int $varianteId, int $cantidad, MotivoMovimientoStock $motivo = MotivoMovimientoStock::PedidoCancelado): void
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
            'motivo' => $motivo,
            'stock_resultante' => $variante->stock,
        ]);
    }
}
