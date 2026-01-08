<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categorias = [
            ['nombre' => 'Chispas frias', 'descripcion' => null],
            ['nombre' => 'Fuegos Artificiales', 'descripcion' => null],
            ['nombre' => 'Maquinaria', 'descripcion' => null],
            ['nombre' => 'Humo', 'descripcion' => null],
            ['nombre' => 'Pirotecnia', 'descripcion' => null],
            ['nombre' => 'Velas', 'descripcion' => null],
        ];

        foreach ($categorias as $categoria) {
            Categoria::create($categoria);
        }
    }
}
