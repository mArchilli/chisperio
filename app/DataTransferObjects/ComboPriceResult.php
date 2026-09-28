<?php

namespace App\DataTransferObjects;

readonly class ComboPriceResult
{
    public function __construct(
        public float $precio_lista,
        public float $precio_unitario_final,
        public bool $descuento_aplicado,
        public float $ahorro_unitario,
        public float $ahorro_porcentaje,
    ) {
    }
}
