<?php

namespace Tests\Feature;

use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TiendaStockTest extends TestCase
{
    use RefreshDatabase;

    public function test_listado_de_tienda_excluye_sin_stock_e_incluye_ilimitado_y_con_stock(): void
    {
        $sinStock = Producto::factory()->create(['is_active' => true, 'stock' => 0]);
        $ilimitado = Producto::factory()->create(['is_active' => true, 'stock' => null]);
        $conStock = Producto::factory()->create(['is_active' => true, 'stock' => 5]);

        $response = $this->get(route('tienda.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Tienda')
            ->has('productos.data', 2)
        );

        $ids = collect($response->viewData('page')['props']['productos']['data'])->pluck('id');
        $this->assertTrue($ids->contains($ilimitado->id));
        $this->assertTrue($ids->contains($conStock->id));
        $this->assertFalse($ids->contains($sinStock->id));
    }

    public function test_ficha_individual_sigue_devolviendo_producto_con_stock_cero(): void
    {
        $producto = Producto::factory()->create(['is_active' => true, 'stock' => 0]);

        $response = $this->get(route('tienda.show', $producto));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('ShowProduct')
            ->where('producto.id', $producto->id)
            ->where('producto.stock', 0)
        );
    }

    public function test_relacionados_en_la_ficha_excluyen_productos_sin_stock(): void
    {
        $producto = Producto::factory()->create(['is_active' => true, 'stock' => 10]);
        $categoria = \App\Models\Categoria::create(['nombre' => 'Categoria Test']);
        $producto->categorias()->attach($categoria->id);

        $relacionadoSinStock = Producto::factory()->create(['is_active' => true, 'stock' => 0]);
        $relacionadoSinStock->categorias()->attach($categoria->id);

        $relacionadoConStock = Producto::factory()->create(['is_active' => true, 'stock' => 3]);
        $relacionadoConStock->categorias()->attach($categoria->id);

        $response = $this->get(route('tienda.show', $producto));

        $response->assertOk();
        $ids = collect($response->viewData('page')['props']['relacionados'])->pluck('id');
        $this->assertTrue($ids->contains($relacionadoConStock->id));
        $this->assertFalse($ids->contains($relacionadoSinStock->id));
    }

    public function test_home_excluye_destacados_sin_stock(): void
    {
        $sinStock = Producto::factory()->create(['is_active' => true, 'is_featured' => true, 'stock' => 0]);
        $conStock = Producto::factory()->create(['is_active' => true, 'is_featured' => true, 'stock' => 2]);

        $response = $this->get('/');

        $response->assertOk();
        $ids = collect($response->viewData('page')['props']['productosDestacados'])->pluck('id');
        $this->assertTrue($ids->contains($conStock->id));
        $this->assertFalse($ids->contains($sinStock->id));
    }
}
