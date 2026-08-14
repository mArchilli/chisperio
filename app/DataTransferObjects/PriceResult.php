<?php

namespace App\DataTransferObjects;

use App\Models\EscalaPrecio;
use App\Models\Oferta;

readonly class PriceResult
{
    public function __construct(
        public float $precio_lista,
        public float $precio_unitario_final,
        public ?Oferta $oferta_aplicada,
        public ?EscalaPrecio $escala_aplicada,
        public float $ahorro_unitario,
        public float $ahorro_porcentaje,
    ) {
    }
}
