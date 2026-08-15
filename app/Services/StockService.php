<?php

namespace App\Services;

use App\Enums\MotivoMovimientoStock;
use App\Exceptions\StockInsuficienteException;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Validación optimista (sin lock) para UX antes de intentar escribir: por cada item
     * del carrito, devuelve los que no tienen stock suficiente. Array vacío = todo disponible.
     *
     * $items tiene el shape que ya usa PedidoController::store: [['producto_id' => int, 'cantidad' => int], ...].
     */
    public function validarDisponibilidad(array $items): array
    {
        $productos = Producto::whereIn('id', array_column($items, 'producto_id'))
            ->get()
            ->keyBy('id');

        $faltantes = [];

        foreach ($items as $item) {
            $producto = $productos->get($item['producto_id']);
            $cantidad = (int) $item['cantidad'];

            if ($producto === null || $producto->tieneStockDisponible($cantidad)) {
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
     * por producto. Si algún item no tiene stock suficiente (chequeado de nuevo bajo el lock,
     * no confiando en la validación optimista previa), aborta todo el descuento.
     *
     * @throws StockInsuficienteException
     */
    public function descontar(Pedido $pedido): void
    {
        DB::transaction(function () use ($pedido) {
            $items = $pedido->items()->with('producto')->get()->sortBy('producto_id');

            foreach ($items as $item) {
                $producto = Producto::where('id', $item->producto_id)->lockForUpdate()->first();

                if ($producto === null || $producto->tieneStockIlimitado()) {
                    continue;
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
        });
    }

    /**
     * Repone stock por cada item del pedido (contraparte de descontar, ej. al cancelar).
     * Idempotente: si ya existe un movimiento pedido_cancelado para este pedido, no hace
     * nada. Esto protege contra una doble ejecución accidental (ej. reponer() llamado dos
     * veces sobre el mismo pedido); no reemplaza la validación de transición de estado
     * (que un pedido solo puede cancelarse una vez), responsabilidad de la Fase 4.
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

            $items = $pedido->items()->with('producto')->get()->sortBy('producto_id');

            foreach ($items as $item) {
                $producto = Producto::where('id', $item->producto_id)->lockForUpdate()->first();

                if ($producto === null || $producto->tieneStockIlimitado()) {
                    continue;
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
        });
    }
}
