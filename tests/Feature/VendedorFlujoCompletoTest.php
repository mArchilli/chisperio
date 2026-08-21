<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Models\Categoria;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendedorFlujoCompletoTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendedor_puede_crear_un_producto_con_stock(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $categoria = Categoria::create(['nombre' => 'Categoria Test']);

        $response = $this->actingAs($vendedor)->post(route('productos.store'), [
            'titulo' => 'Producto de prueba vendedor',
            'descripcion' => 'Descripción de prueba',
            'precio' => 1500,
            'stock' => 20,
            'is_active' => true,
            'is_featured' => false,
            'categorias' => [$categoria->id],
            'subcategorias' => [],
        ]);

        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('productos', [
            'titulo' => 'Producto de prueba vendedor',
            'stock' => 20,
        ]);
    }

    public function test_vendedor_puede_editar_producto_y_actualizar_stock(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $producto = Producto::factory()->create(['stock' => 5]);

        $response = $this->actingAs($vendedor)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'descripcion' => $producto->descripcion,
            'precio' => $producto->precio,
            'stock' => 40,
            'is_active' => true,
            'is_featured' => false,
            'categorias' => [],
            'subcategorias' => [],
        ]);

        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('productos', ['id' => $producto->id, 'stock' => 40]);
    }

    public function test_vendedor_ve_montos_individuales_y_acumulado_en_pedidos_index(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $producto = Producto::factory()->create();

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 1500,
            'total' => 1500,
            'estado' => EstadoPedido::Pendiente,
        ]);
        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => 1500,
            'cantidad' => 1,
            'subtotal' => 1500,
        ]);

        $response = $this->actingAs($vendedor)->get(route('pedidos.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Index')
            ->has('stats.facturacion')
            ->where('pedidos.data.0.total', '1500.00')
        );
    }

    public function test_vendedor_puede_cambiar_estado_de_pedido_incluida_cancelacion(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $producto = Producto::factory()->create(['stock' => 10]);

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 1500,
            'total' => 1500,
            'estado' => EstadoPedido::Pendiente,
        ]);
        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => 1500,
            'cantidad' => 2,
            'subtotal' => 3000,
        ]);

        $despacho = $this->actingAs($vendedor)->patch(route('pedidos.cambiar-estado', $pedido), [
            'estado' => 'despachado',
        ]);
        $despacho->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);

        $vuelta = $this->actingAs($vendedor)->patch(route('pedidos.cambiar-estado', $pedido), [
            'estado' => 'pendiente',
        ]);
        $vuelta->assertSessionHasNoErrors();

        $cancelacion = $this->actingAs($vendedor)->patch(route('pedidos.cambiar-estado', $pedido), [
            'estado' => 'cancelado',
        ]);
        $cancelacion->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
    }
}
