<?php

namespace Database\Factories;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\Oferta;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Oferta>
 */
class OfertaFactory extends Factory
{
    protected $model = Oferta::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'producto_id' => Producto::factory(),
            // Campos legacy, NOT NULL en la tabla; no los consume PricingService pero
            // la columna no admite null. Ver App\Console\Commands\BackfillOfertasDescuento.
            'precio_oferta' => 0,
            'porcentaje_descuento' => 0,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
            'alcance' => AlcanceOferta::Todos,
            'producto_escala_precio_id' => null,
            'fecha_inicio' => null,
            'fecha_fin' => null,
            'is_active' => true,
        ];
    }
}
