<?php

namespace App\Services;

use App\Enums\TipoDescuento;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Aumento masivo de precios de productos (porcentaje o monto fijo).
 *
 * Alcance: el precio base del producto Y el precio unitario de cada una de sus escalas
 * por cantidad — si solo subiera el base, una escala podría quedar más barata que el
 * precio de lista y la tabla de precios por cantidad quedaría incoherente. No toca los
 * recargos de variante ni los add-ons (son importes propios, no precios de lista), ni
 * los combos (tienen su precio fijo). Las ofertas porcentuales siguen solas al nuevo
 * precio; las de monto fijo no cambian.
 */
class AumentoPreciosService
{
    /** Tope de la columna decimal(10,2). */
    private const PRECIO_MAXIMO = 99999999.99;

    /**
     * Precio resultante de aplicar el aumento. Fuente de verdad del cálculo (el modal
     * del admin lo espeja en resources/js/lib/aumentoPrecios.js solo para la vista previa).
     */
    public static function nuevoPrecio(float $precio, TipoDescuento $tipo, float $valor): float
    {
        return round(match ($tipo) {
            TipoDescuento::Porcentaje => $precio * (1 + $valor / 100),
            TipoDescuento::Fijo => $precio + $valor,
        }, 2);
    }

    /**
     * @param  array<int, int>  $productoIds
     * @return int Cantidad de productos actualizados.
     *
     * @throws ValidationException Si algún precio resultante no entra en la columna;
     *                             en ese caso no se actualiza nada (transacción).
     */
    public function aplicar(array $productoIds, TipoDescuento $tipo, float $valor): int
    {
        return DB::transaction(function () use ($productoIds, $tipo, $valor) {
            $productos = Producto::with('escalasPrecio')
                ->whereIn('id', $productoIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($productos as $producto) {
                $nuevoBase = self::nuevoPrecio((float) $producto->precio, $tipo, $valor);

                $nuevasEscalas = $producto->escalasPrecio->mapWithKeys(
                    fn ($escala) => [$escala->id => self::nuevoPrecio((float) $escala->precio_unitario, $tipo, $valor)]
                );

                if ($nuevoBase > self::PRECIO_MAXIMO || $nuevasEscalas->contains(fn (float $precio) => $precio > self::PRECIO_MAXIMO)) {
                    throw ValidationException::withMessages([
                        'valor' => "El aumento deja a \"{$producto->titulo}\" con un precio demasiado alto. No se actualizó ningún producto.",
                    ]);
                }

                $producto->update(['precio' => $nuevoBase]);

                foreach ($producto->escalasPrecio as $escala) {
                    $escala->update(['precio_unitario' => $nuevasEscalas[$escala->id]]);
                }
            }

            return $productos->count();
        });
    }
}
