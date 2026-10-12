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
     * Precio resultante de aplicar el aumento (o la baja, con $bajar). Fuente de verdad del
     * cálculo (el modal del admin lo espeja en resources/js/lib/aumentoPrecios.js solo
     * para la vista previa).
     */
    public static function nuevoPrecio(float $precio, TipoDescuento $tipo, float $valor, bool $bajar = false): float
    {
        $signo = $bajar ? -1 : 1;

        return round(match ($tipo) {
            TipoDescuento::Porcentaje => $precio * (1 + $signo * $valor / 100),
            TipoDescuento::Fijo => $precio + $signo * $valor,
        }, 2);
    }

    /**
     * @param  array<int, int>  $productoIds
     * @return int Cantidad de productos actualizados.
     *
     * @throws ValidationException Si algún precio resultante no entra en la columna (o, al
     *                             bajar, queda en cero o negativo); en ese caso no se
     *                             actualiza nada (transacción).
     */
    public function aplicar(array $productoIds, TipoDescuento $tipo, float $valor, bool $bajar = false): int
    {
        return DB::transaction(function () use ($productoIds, $tipo, $valor, $bajar) {
            $productos = Producto::with('escalasPrecio')
                ->whereIn('id', $productoIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($productos as $producto) {
                $nuevoBase = self::nuevoPrecio((float) $producto->precio, $tipo, $valor, $bajar);

                $nuevasEscalas = $producto->escalasPrecio->mapWithKeys(
                    fn ($escala) => [$escala->id => self::nuevoPrecio((float) $escala->precio_unitario, $tipo, $valor, $bajar)]
                );

                if ($bajar && ($nuevoBase <= 0 || $nuevasEscalas->contains(fn (float $precio) => $precio <= 0))) {
                    throw ValidationException::withMessages([
                        'valor' => "La baja deja a \"{$producto->titulo}\" con un precio de \$0 o negativo. No se actualizó ningún producto.",
                    ]);
                }

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
