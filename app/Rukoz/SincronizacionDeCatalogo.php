<?php

namespace App\Rukoz;

use App\Models\Combo;
use App\Models\Producto;
use Rukoz\CoreClient\Facades\Rukoz;
use Throwable;

/**
 * Sync parcial del catálogo hacia el Central desde el panel de administración, DESPUÉS de guardar
 * (fuera de la transacción). Solo actúa con INTEGRACION_CATALOGO encendido y nunca rompe el
 * guardado: si el Central no está, el paquete deja los ids diferidos para el próximo sync
 * completo; si algo más falla se reporta y se sigue.
 *
 * Un combo depende de las variantes de sus productos (sus opciones), así que al guardar un
 * producto se vuelven a mandar los combos que lo contienen, después del producto.
 */
class SincronizacionDeCatalogo
{
    public static function activa(): bool
    {
        return (bool) config('integracion.catalogo');
    }

    public static function producto(Producto|int $producto): void
    {
        if (! self::activa()) {
            return;
        }

        $id = $producto instanceof Producto ? $producto->getKey() : $producto;

        self::seguro(function () use ($id) {
            Rukoz::sincronizarProductos([$id]);

            $combos = Combo::query()
                ->whereHas('items', fn ($q) => $q->where('producto_id', $id))
                ->pluck('id')
                ->all();

            if ($combos !== []) {
                Rukoz::sincronizarCombos($combos);
            }
        });
    }

    public static function combo(Combo|int $combo): void
    {
        if (! self::activa()) {
            return;
        }

        $id = $combo instanceof Combo ? $combo->getKey() : $combo;

        self::seguro(fn () => Rukoz::sincronizarCombos([$id]));
    }

    private static function seguro(callable $accion): void
    {
        try {
            $accion();
        } catch (Throwable $e) {
            report($e);
        }
    }
}
