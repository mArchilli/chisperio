<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Se lanza cuando PricingService::resolverVariante() recibe $varianteId === null (con
 * $exigirVariante = true) para un producto que tiene al menos una variante activa: el
 * caller pidió explícitamente que esta ruta no calcule un precio incompleto en silencio.
 * Defensa en profundidad detrás del guard explícito de PedidoController::store — ver ahí.
 */
class VarianteRequeridaException extends RuntimeException
{
    public function __construct(
        public readonly int $productoId,
    ) {
        parent::__construct("El producto {$productoId} tiene variantes activas: hace falta indicar variante_id.");
    }
}
