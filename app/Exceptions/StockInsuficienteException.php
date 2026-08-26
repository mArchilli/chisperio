<?php

namespace App\Exceptions;

use RuntimeException;

class StockInsuficienteException extends RuntimeException
{
    public function __construct(
        public readonly int $productoId,
        public readonly int $cantidadSolicitada,
        public readonly int $stockDisponible,
        public readonly ?int $varianteId = null,
    ) {
        $sujeto = $varianteId !== null
            ? "la variante {$varianteId} del producto {$productoId}"
            : "el producto {$productoId}";

        parent::__construct(
            "Stock insuficiente para {$sujeto}: se pidieron {$cantidadSolicitada}, disponibles {$stockDisponible}."
        );
    }
}
