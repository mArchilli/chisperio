<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SubcategoriaSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subcategorias = [
            'Chispas frias' => ['2x20', '3x30', '4x30', '5x1', 'con mecha'],
            'Fuegos Artificiales' => ['9 Tiros', '16 Tiros', '32 Tiros'],
            'Maquinaria' => ['Baston de Mano', 'Detonador Inalambrico', 'Humo vertical', 'Lanzallama', 'Pistola'],
            'Humo' => ['Bengala', 'Pote', 'Torta'],
            'Pirotecnia' => ['Pirotecnia'],
            'Velas' => ['Bengalas', 'Sparkie'],
        ];

        foreach ($subcategorias as $categoriaNombre => $subcategoriasArray) {
            $categoria = Categoria::where('nombre', $categoriaNombre)->first();
            
            if ($categoria) {
                foreach ($subcategoriasArray as $subcategoriaNombre) {
                    Subcategoria::create([
                        'nombre' => $subcategoriaNombre,
                        'descripcion' => null,
                        'categoria_id' => $categoria->id,
                    ]);
                }
            }
        }
    }
}
