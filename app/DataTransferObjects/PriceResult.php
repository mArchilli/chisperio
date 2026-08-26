<?php

namespace App\DataTransferObjects;

use App\Models\Addon;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\ProductoVariante;

readonly class PriceResult
{
    /**
     * @param  Addon[]  $addons_aplicados  Addons resueltos (asociados + activos) para
     *                                     los ids pedidos, con el pivot precio_override/orden cargado.
     */
    public function __construct(
        public float $precio_lista,
        public float $precio_unitario_final,
        public ?Oferta $oferta_aplicada,
        public ?EscalaPrecio $escala_aplicada,
        public float $ahorro_unitario,
        public float $ahorro_porcentaje,
        public ?ProductoVariante $variante_aplicada = null,
        public float $recargo_variante = 0.0,
        public array $addons_aplicados = [],
        public float $addons_total = 0.0,
        // precio_unitario_final + recargo_variante + addons_total: el descuento de la
        // oferta NUNCA se recalcula sobre este total, ver PricingService::calcularPrecio.
        public float $precio_final_con_opciones = 0.0,
    ) {
    }
}
