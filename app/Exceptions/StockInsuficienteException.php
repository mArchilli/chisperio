<?php

namespace App\Exceptions;

use RuntimeException;

class StockInsuficienteException extends RuntimeException
{
    public function __construct(
        public readonly int $productoId,
        public readonly int $cantidadSolicitada,
        public readonly int $stockDisponible,
    ) {
        parent::__construct(
            "Stock insuficiente para el producto {$productoId}: se pidieron {$cantidadSolicitada}, disponibles {$stockDisponible}."
        );
    }
}
