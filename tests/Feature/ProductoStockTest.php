<?php

namespace Tests\Feature;

use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductoStockTest extends TestCase
{
    use RefreshDatabase;

    public function test_crear_producto_con_stock_lo_guarda(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Con Stock',
            'precio' => 1000,
            'stock' => 5,
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertSame(5, Producto::where('titulo', 'Producto Con Stock')->firstOrFail()->stock);
    }

    public function test_crear_producto_sin_stock_queda_ilimitado(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Sin Stock Definido',
            'precio' => 1000,
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertNull(Producto::where('titulo', 'Producto Sin Stock Definido')->firstOrFail()->stock);
    }

    public function test_rechaza_stock_negativo(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Stock Invalido',
            'precio' => 1000,
            'stock' => -1,
        ]);

        $response->assertSessionHasErrors(['stock']);
        $this->assertDatabaseMissing('productos', ['titulo' => 'Producto Stock Invalido']);
    }

    public function test_editar_producto_actualiza_stock(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['stock' => 5]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto->id), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'stock' => 12,
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertSame(12, $producto->fresh()->stock);
    }

    public function test_editar_producto_vaciando_stock_lo_vuelve_ilimitado(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['stock' => 5]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto->id), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'stock' => null,
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertNull($producto->fresh()->stock);
    }
}
