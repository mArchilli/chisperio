<?php

namespace Database\Factories;

use App\Models\EscalaPrecio;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EscalaPrecio>
 */
class EscalaPrecioFactory extends Factory
{
    protected $model = EscalaPrecio::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'producto_id' => Producto::factory(),
            'cantidad_minima' => fake()->numberBetween(2, 50),
            'precio_unitario' => fake()->randomFloat(2, 500, 50000),
        ];
    }
}
