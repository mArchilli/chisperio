<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PedidoShowVariantesAddonsTest extends TestCase
{
    use RefreshDatabase;

    public function test_pedido_show_expone_el_snapshot_de_variante_y_addons_del_item(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['titulo' => 'Producto con variante']);

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 1400,
            'total' => 1400,
            'estado' => EstadoPedido::Pendiente,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => 1400,
            'cantidad' => 1,
            'subtotal' => 1400,
            'variante_nombre' => 'Rojo',
            'variante_color_hex' => '#ff0000',
            'recargo_variante_unitario' => 150,
            'addons_seleccionados' => [
                ['addon_id' => 1, 'nombre' => 'Grabado', 'precio' => 250, 'texto_personalizado' => 'Juan'],
            ],
            'addons_total_unitario' => 250,
            'precio_base_unitario' => 1000,
        ]);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Pedidos/Show')
            ->where('pedido.items.0.variante_nombre', 'Rojo')
            ->where('pedido.items.0.variante_color_hex', '#ff0000')
            ->where('pedido.items.0.addons_seleccionados.0.nombre', 'Grabado')
            ->where('pedido.items.0.addons_seleccionados.0.texto_personalizado', 'Juan')
        );
    }

    public function test_pedido_show_expone_el_color_personalizado_texto_del_item(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['titulo' => 'Producto con color a elección']);

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 1000,
            'total' => 1000,
            'estado' => EstadoPedido::Pendiente,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => 1000,
            'cantidad' => 1,
            'subtotal' => 1000,
            'variante_nombre' => 'Otro / A elección',
            'variante_color_hex' => '#000000',
            'color_personalizado_texto' => 'Verde flúo (#39FF14)',
        ]);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Pedidos/Show')
            ->where('pedido.items.0.color_personalizado_texto', 'Verde flúo (#39FF14)')
        );
    }

    public function test_pedido_show_sin_variante_ni_addons_expone_esos_campos_en_null(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create();

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 500,
            'total' => 500,
            'estado' => EstadoPedido::Pendiente,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => 500,
            'cantidad' => 1,
            'subtotal' => 500,
        ]);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Pedidos/Show')
            ->where('pedido.items.0.variante_nombre', null)
            ->where('pedido.items.0.addons_seleccionados', null)
        );
    }
}
