<?php

namespace Database\Factories;

use App\Models\Resena;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resena>
 */
class ResenaFactory extends Factory
{
    protected $model = Resena::class;

    public function definition(): array
    {
        return [
            'nombre' => fake()->name(),
            'meta' => null,
            'texto' => fake()->sentence(),
            'puntuacion' => 5,
            'fecha' => now()->subDays(fake()->numberBetween(1, 120))->toDateString(),
            'color_avatar' => fake()->randomElement(Resena::COLORES),
            'is_active' => true,
        ];
    }
}
