<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Productos temporales solo para pruebas (precios y escalas por cantidad).
 * El catálogo real se carga manualmente desde el panel de administración.
 */
class ProductoSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $productos = [
            [
                'titulo'      => 'Producto de Prueba 50k',
                'descripcion' => '<p>Producto temporal para pruebas de precios y escalas por cantidad.</p>',
                'precio'      => 50000,
                'categoria'   => 'Maquinaria',
                'escalas'     => [
                    ['cantidad_minima' => 3, 'precio_unitario' => 47000],
                    ['cantidad_minima' => 5, 'precio_unitario' => 44000],
                    ['cantidad_minima' => 10, 'precio_unitario' => 40000],
                ],
            ],
            [
                'titulo'      => 'Producto de Prueba 100k',
                'descripcion' => '<p>Producto temporal para pruebas de precios y escalas por cantidad.</p>',
                'precio'      => 100000,
                'categoria'   => 'Fuegos Artificiales',
                'escalas'     => [
                    ['cantidad_minima' => 3, 'precio_unitario' => 92000],
                    ['cantidad_minima' => 5, 'precio_unitario' => 85000],
                    ['cantidad_minima' => 10, 'precio_unitario' => 78000],
                ],
            ],
            [
                'titulo'      => 'Producto de Prueba 300k',
                'descripcion' => '<p>Producto temporal para pruebas de precios y escalas por cantidad.</p>',
                'precio'      => 300000,
                'categoria'   => 'Pirotecnia',
                'escalas'     => [
                    ['cantidad_minima' => 3, 'precio_unitario' => 270000],
                    ['cantidad_minima' => 5, 'precio_unitario' => 250000],
                    ['cantidad_minima' => 10, 'precio_unitario' => 225000],
                ],
            ],
        ];

        foreach ($productos as $data) {
            $producto = Producto::create([
                'titulo'      => $data['titulo'],
                'descripcion' => $data['descripcion'],
                'precio'      => $data['precio'],
                'is_active'   => true,
                'is_featured' => false,
            ]);

            $categoriaId = Categoria::where('nombre', $data['categoria'])->value('id');
            if ($categoriaId) {
                $producto->categorias()->sync([$categoriaId]);
            }

            foreach ($data['escalas'] as $escala) {
                $producto->escalasPrecio()->create($escala);
            }
        }
    }
}
