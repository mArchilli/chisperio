<?php

namespace Database\Factories;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Producto>
 */
class ProductoFactory extends Factory
{
    protected $model = Producto::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'titulo' => fake()->words(3, true),
            'descripcion' => fake()->sentence(),
            'precio' => fake()->randomFloat(2, 1000, 100000),
            'is_active' => true,
            'is_featured' => false,
        ];
    }
}
