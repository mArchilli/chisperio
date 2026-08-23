<?php

namespace Database\Factories;

use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CodigoDescuento>
 */
class CodigoDescuentoFactory extends Factory
{
    protected $model = CodigoDescuento::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'codigo' => strtoupper($this->faker->unique()->bothify('CODIGO##??')),
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
            'activo' => true,
            'vigente_desde' => null,
            'vigente_hasta' => null,
            'limite_usos' => null,
            'usos_actuales' => 0,
        ];
    }
}
