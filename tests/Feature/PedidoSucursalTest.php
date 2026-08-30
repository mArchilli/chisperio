<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\Sucursal;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoSucursalTest extends TestCase
{
    use RefreshDatabase;

    private function crearPedido(Sucursal $sucursal, EstadoPedido $estado = EstadoPedido::Pendiente): Pedido
    {
        $producto = Producto::factory()->create();

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente '.$sucursal->value,
            'subtotal' => 1000,
            'total' => 1000,
            'estado' => $estado,
            'sucursal' => $sucursal,
            'despachado_at' => $estado === EstadoPedido::Despachado ? now() : null,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => 1000,
            'cantidad' => 1,
            'subtotal' => 1000,
        ]);

        return $pedido;
    }

    /* ─── Checkout: persistencia de la sucursal ─────────────────────────────── */

    public function test_checkout_persiste_la_sucursal_elegida(): void
    {
        $producto = Producto::factory()->create(['precio' => 500, 'stock' => 10]);

        $response = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente Córdoba',
            'sucursal' => 'cordoba',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ]);

        $response->assertCreated();
        $this->assertSame(Sucursal::Cordoba, Pedido::firstOrFail()->sucursal);
    }

    public function test_checkout_sin_sucursal_cae_en_buenos_aires(): void
    {
        $producto = Producto::factory()->create(['precio' => 500, 'stock' => 10]);

        $response = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente sin sucursal',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ]);

        $response->assertCreated();
        $this->assertSame(Sucursal::BuenosAires, Pedido::firstOrFail()->sucursal);
    }

    public function test_checkout_con_sucursal_invalida_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 500, 'stock' => 10]);

        $response = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente',
            'sucursal' => 'mendoza',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ]);

        $response->assertStatus(422);
        $this->assertSame(0, Pedido::count());
    }

    /* ─── Listado: qué ve cada quién ───────────────────────────────────────── */

    public function test_vendedor_solo_ve_pedidos_de_su_sucursal(): void
    {
        $this->crearPedido(Sucursal::Cordoba);
        $this->crearPedido(Sucursal::BuenosAires);

        $vendedor = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        $this->actingAs($vendedor)->get(route('pedidos.index', ['estado' => 'todos']))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Pedidos/Index')
                ->where('filtroSucursal', 'cordoba')
                ->where('puedeFiltrarSucursal', false)
                ->has('pedidos.data', 1)
                ->where('pedidos.data.0.sucursal', 'cordoba')
                ->where('stats.pendientes_count', 1)
            );
    }

    public function test_admin_ve_todas_las_sucursales_y_puede_filtrar(): void
    {
        $this->crearPedido(Sucursal::Cordoba);
        $this->crearPedido(Sucursal::BuenosAires);
        $this->crearPedido(Sucursal::BuenosAires);

        $admin = User::factory()->create();

        $this->actingAs($admin)->get(route('pedidos.index', ['estado' => 'todos']))
            ->assertInertia(fn ($page) => $page
                ->where('filtroSucursal', 'todas')
                ->where('puedeFiltrarSucursal', true)
                ->has('pedidos.data', 3)
                ->where('stats.pendientes_count', 3)
            );

        $this->actingAs($admin)->get(route('pedidos.index', ['estado' => 'todos', 'sucursal' => 'cordoba']))
            ->assertInertia(fn ($page) => $page
                ->where('filtroSucursal', 'cordoba')
                ->has('pedidos.data', 1)
                ->where('stats.pendientes_count', 1)
            );
    }

    public function test_vendedor_ignora_el_query_param_de_sucursal(): void
    {
        $this->crearPedido(Sucursal::Cordoba);
        $this->crearPedido(Sucursal::BuenosAires);

        $vendedor = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        // Aunque pida ?sucursal=buenos-aires, sigue viendo solo Córdoba.
        $this->actingAs($vendedor)->get(route('pedidos.index', ['estado' => 'todos', 'sucursal' => 'buenos-aires']))
            ->assertInertia(fn ($page) => $page
                ->where('filtroSucursal', 'cordoba')
                ->has('pedidos.data', 1)
            );
    }

    /* ─── Detalle y cambio de estado: guard por sucursal ───────────────────── */

    public function test_vendedor_no_puede_ver_pedido_de_otra_sucursal(): void
    {
        $pedidoBsAs = $this->crearPedido(Sucursal::BuenosAires);
        $vendedorCordoba = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        $this->actingAs($vendedorCordoba)->get(route('pedidos.show', $pedidoBsAs))->assertForbidden();
    }

    public function test_vendedor_no_puede_cambiar_estado_de_pedido_de_otra_sucursal(): void
    {
        $pedidoBsAs = $this->crearPedido(Sucursal::BuenosAires);
        $vendedorCordoba = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        $this->actingAs($vendedorCordoba)
            ->patch(route('pedidos.cambiar-estado', $pedidoBsAs), ['estado' => 'despachado'])
            ->assertForbidden();

        $this->assertSame(EstadoPedido::Pendiente, $pedidoBsAs->fresh()->estado);
    }

    public function test_vendedor_si_puede_ver_y_operar_pedido_de_su_sucursal(): void
    {
        $pedido = $this->crearPedido(Sucursal::Cordoba);
        $vendedor = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        $this->actingAs($vendedor)->get(route('pedidos.show', $pedido))->assertOk();

        $this->actingAs($vendedor)
            ->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'despachado'])
            ->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
    }

    public function test_admin_puede_ver_pedido_de_cualquier_sucursal(): void
    {
        $pedido = $this->crearPedido(Sucursal::Cordoba);
        $admin = User::factory()->create();

        $this->actingAs($admin)->get(route('pedidos.show', $pedido))->assertOk();
    }
}
