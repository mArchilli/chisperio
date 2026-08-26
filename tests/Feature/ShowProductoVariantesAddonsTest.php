<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ShowProductoVariantesAddonsTest extends TestCase
{
    use RefreshDatabase;

    public function test_ficha_expone_solo_variantes_y_addons_activos(): void
    {
        $producto = Producto::factory()->create(['is_active' => true]);

        $varianteActiva = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 100, 'stock' => 5, 'is_active' => true,
        ]);
        ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Descontinuado', 'color_hex' => '#000000',
            'precio_adicional' => 0, 'stock' => 5, 'is_active' => false,
        ]);

        $addonActivo = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'is_active' => true]);
        $addonInactivo = Addon::create(['nombre' => 'Viejo', 'precio' => 50, 'is_active' => false]);
        $producto->addons()->attach($addonActivo->id, ['precio_override' => 250, 'orden' => 0]);
        $producto->addons()->attach($addonInactivo->id, ['orden' => 1]);

        $response = $this->get(route('tienda.show', $producto));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('ShowProduct')
            ->has('producto.variantes', 1)
            ->where('producto.variantes.0.id', $varianteActiva->id)
            ->where('producto.variantes.0.color_hex', '#ff0000')
            ->has('producto.addons', 1)
            ->where('producto.addons.0.id', $addonActivo->id)
            ->where('producto.addons.0.pivot.precio_override', 250)
        );
    }

    public function test_ficha_de_producto_sin_variantes_ni_addons_expone_arrays_vacios(): void
    {
        $producto = Producto::factory()->create(['is_active' => true]);

        $response = $this->get(route('tienda.show', $producto));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('ShowProduct')
            ->has('producto.variantes', 0)
            ->has('producto.addons', 0)
        );
    }
}
