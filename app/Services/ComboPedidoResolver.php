<?php

namespace App\Services;

use App\Models\Combo;
use Illuminate\Validation\ValidationException;

/**
 * Resuelve una línea de combo ({combo_id, cantidad, selecciones}) contra su receta real
 * (combo_productos). La comparten el checkout (PedidoController::store) y la edición de
 * pedidos (PedidoEdicionService), así las dos arman el mismo snapshot.
 */
class ComboPedidoResolver
{
    /**
     * Por cada item de la receta usa la variante fija del admin si la hay; si no, busca la
     * elegida en `selecciones` (por combo_producto_id) y valida que sea una variante activa
     * de ESE producto — nunca se confía en el frontend. Si el producto no tiene variantes
     * activas, no hace falta ninguna selección.
     *
     * Devuelve el combo cargado, la cantidad de combos pedida, y el snapshot de
     * componentes ya resuelto (`combo_items_seleccionados`) con las cantidades totales
     * (cantidad de receta × cantidad de combos) listas para precio/stock.
     *
     * @return array{combo: Combo, cantidad: int, componentes: array<int, array{producto_id: int, producto_variante_id: ?int, titulo: string, variante_nombre: ?string, variante_color_hex: ?string, cantidad_por_combo: int, cantidad_total: int}>}
     *
     * @throws ValidationException
     */
    public function resolverLinea(array $comboInput): array
    {
        $combo = Combo::with(['items.producto.variantesActivas', 'items.productoVariante'])
            ->find($comboInput['combo_id']);

        if ($combo === null || ! $combo->is_active) {
            throw ValidationException::withMessages([
                'combos' => 'Uno de los combos elegidos ya no está disponible.',
            ]);
        }

        $cantidadCombo = (int) $comboInput['cantidad'];
        $seleccionesInput = collect($comboInput['selecciones'] ?? [])->keyBy('combo_producto_id');

        $componentes = [];

        foreach ($combo->items as $item) {
            $varianteResuelta = null;

            if ($item->producto_variante_id !== null) {
                $varianteResuelta = $item->productoVariante;
            } elseif ($item->producto->variantesActivas->isNotEmpty()) {
                $varianteIdElegida = $seleccionesInput->get($item->id)['variante_id'] ?? null;

                if ($varianteIdElegida !== null) {
                    $varianteResuelta = $item->producto->variantesActivas->firstWhere('id', (int) $varianteIdElegida);
                }

                if ($varianteResuelta === null) {
                    throw ValidationException::withMessages([
                        'combos' => "Elegí un color para \"{$item->producto->titulo}\" dentro del combo \"{$combo->titulo}\".",
                    ]);
                }
            }

            $componentes[] = [
                'producto_id' => $item->producto_id,
                'producto_variante_id' => $varianteResuelta?->id,
                'titulo' => $item->producto->titulo,
                'variante_nombre' => $varianteResuelta?->nombre,
                'variante_color_hex' => $varianteResuelta?->color_hex,
                'cantidad_por_combo' => $item->cantidad,
                'cantidad_total' => $item->cantidad * $cantidadCombo,
            ];
        }

        return ['combo' => $combo, 'cantidad' => $cantidadCombo, 'componentes' => $componentes];
    }
}
