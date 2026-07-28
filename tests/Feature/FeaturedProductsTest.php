<?php

namespace Tests\Feature;

use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FeaturedProductsTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_only_receives_active_featured_products(): void
    {
        $featured = Producto::create([
            'titulo' => 'Producto destacado visible',
            'precio' => 125000,
            'is_active' => true,
            'is_featured' => true,
        ]);

        Producto::create([
            'titulo' => 'Producto destacado inactivo',
            'precio' => 95000,
            'is_active' => false,
            'is_featured' => true,
        ]);

        Producto::create([
            'titulo' => 'Producto activo sin destacar',
            'precio' => 75000,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->has('productosDestacados', 1)
                ->where('productosDestacados.0.id', $featured->id)
                ->where('productosDestacados.0.is_active', true)
                ->where('productosDestacados.0.is_featured', true)
                ->has('productosDestacados.0.imagen_principal')
                ->has('productosDestacados.0.oferta_vigente')
                ->has('productosDestacados.0.categorias')
            );
    }

    public function test_authenticated_user_can_toggle_a_product_featured_status(): void
    {
        $user = User::factory()->create();
        $product = Producto::create([
            'titulo' => 'Producto para destacar',
            'precio' => 50000,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $this->actingAs($user)
            ->patch(route('productos.toggle-featured', $product))
            ->assertRedirect();

        $this->assertTrue($product->refresh()->is_featured);

        $this->actingAs($user)
            ->patch(route('productos.toggle-featured', $product))
            ->assertRedirect();

        $this->assertFalse($product->refresh()->is_featured);
    }
}
