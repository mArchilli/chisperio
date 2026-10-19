<?php

namespace Tests\Feature\Rukoz;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Rukoz\EspejoStock;
use App\Rukoz\EstadoDesdeCentral;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Rukoz\CoreClient\Eventos\PedidoActualizado;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/**
 * 11.4 — Después de confirmar, el pedido es de SOLO LECTURA en la web: ni ítems, precios, cantidades, cliente, cupón o notas
 * (backend, no solo la UI); no se cancela desde la web («Para anular, hacelo en el Sistema Central»); la cancelación automática
 * no lo toca. Se puede ver todo.
 */
class PedidoConfirmadoSoloLecturaTest extends TestCase
{
    use RefreshDatabase;

    private CentralDePrueba $central;

    protected function setUp(): void
    {
        parent::setUp();

        $this->central = CentralDePrueba::instalar();
        config(['integracion.confirmacion' => true]);
        Event::listen(StockActualizado::class, [EspejoStock::class, 'alActualizarse']);
        Event::listen(PedidoActualizado::class, [EstadoDesdeCentral::class, 'alActualizarse']);
    }

    protected function tearDown(): void
    {
        $this->assertSame([], $this->central->erroresDeContrato);

        parent::tearDown();
    }

    private function confirmado(): Pedido
    {
        $producto = Producto::factory()->create(['titulo' => 'Chispa', 'precio' => 1000, 'stock' => 50]);
        $id = $this->postJson('/checkout', ['cliente_nombre' => 'Cliente', 'cliente_telefono' => '1155550000', 'observaciones' => 'Nota original', 'items' => [['producto_id' => $producto->id, 'cantidad' => 2]]])->assertCreated()->json('id');
        $pedido = Pedido::findOrFail($id);

        $this->actingAs(User::factory()->create(['rukoz_vendedor_id' => '7']))
            ->post(route('pedidos.confirmar', $pedido), ['pagos' => [], 'envio' => ['forma_envio_id' => 1, 'costo_cobrado' => 0, 'es_gratis' => false, 'transportista_id' => 1]])
            ->assertSessionHasNoErrors();

        return $pedido->fresh()->load('items');
    }

    private function payloadDeEdicion(Pedido $pedido, array $cambios = []): array
    {
        $item = $pedido->items->first();

        return [
            'cliente_nombre' => 'Otro Nombre',
            'cliente_telefono' => '1100000000',
            'observaciones' => 'Nota cambiada',
            'items' => [['id' => $item->id, 'cantidad' => 9, 'precio_unitario' => 1, 'color_personalizado_texto' => 'Rojo']],
            ...$cambios,
        ];
    }

    private function sinCambios(Pedido $original): void
    {
        $actual = Pedido::with('items')->findOrFail($original->id);

        $this->assertSame($original->cliente_nombre, $actual->cliente_nombre);
        $this->assertSame($original->observaciones, $actual->observaciones);
        $this->assertSame((float) $original->total, (float) $actual->total);
        $this->assertSame($original->items->first()->cantidad, $actual->items->first()->cantidad);
        $this->assertSame((float) $original->items->first()->precio_unitario, (float) $actual->items->first()->precio_unitario);
        $this->assertNull($actual->items->first()->color_personalizado_texto);
        $this->assertNull($actual->editado_at);
        $this->assertSame($original->rukoz_version, $actual->rukoz_version);
    }

    public function test_el_backend_rechaza_editar_un_pedido_confirmado_y_no_llama_al_central(): void
    {
        $pedido = $this->confirmado();
        $llamadasAntes = count($this->central->llamadas);

        $this->actingAs(User::factory()->create())
            ->put(route('pedidos.update', $pedido), $this->payloadDeEdicion($pedido))
            ->assertSessionHasErrors('estado');

        $this->assertStringContainsString('solo lectura', session('errors')->first('estado'));
        $this->sinCambios($pedido);
        $this->assertSame([], $this->central->llamadasA('PUT', '#^/pedidos/#'));
        $this->assertCount($llamadasAntes, $this->central->llamadas, 'Ni siquiera se consultó al Central');
    }

    public function test_tampoco_se_puede_sumar_una_linea_cambiar_el_cupon_ni_las_notas(): void
    {
        $pedido = $this->confirmado();
        $producto = Producto::factory()->create(['precio' => 500, 'stock' => 10]);
        $item = $pedido->items->first();

        $this->actingAs(User::factory()->create())
            ->put(route('pedidos.update', $pedido), [
                'cliente_nombre' => $pedido->cliente_nombre,
                'items' => [['id' => $item->id, 'cantidad' => $item->cantidad, 'precio_unitario' => (float) $item->precio_unitario, 'color_personalizado_texto' => 'Turquesa', 'addons_textos' => [1 => 'Hola']]],
                'nuevos_items' => [['tipo' => 'producto', 'producto_id' => $producto->id, 'cantidad' => 1]],
                'codigo_descuento' => 'REGALO',
            ])
            ->assertSessionHasErrors('estado');

        $this->sinCambios($pedido);
        $this->assertCount(1, Pedido::findOrFail($pedido->id)->items);
    }

    public function test_la_pantalla_de_edicion_redirige_a_la_ficha_con_el_motivo(): void
    {
        $pedido = $this->confirmado();

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.edit', $pedido))
            ->assertRedirect(route('pedidos.show', $pedido))
            ->assertSessionHas('error');

        $this->assertStringContainsString('solo lectura', session('error'));
    }

    public function test_no_se_puede_cancelar_ni_cambiar_el_estado_desde_la_web(): void
    {
        $pedido = $this->confirmado();
        $admin = User::factory()->create();

        foreach (['cancelado', 'pendiente', 'despachado', 'confirmado', 'anulado'] as $destino) {
            $this->actingAs($admin)->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => $destino])->assertSessionHasErrors('estado');
        }

        // «Para anular, hacelo en el Sistema Central».
        $this->actingAs($admin)->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'cancelado']);
        $this->assertSame('Para anular, hacelo en el Sistema Central.', session('errors')->first('estado'));

        $this->assertSame(EstadoPedido::Confirmado, $pedido->fresh()->estado);
        $this->assertSame([], $this->central->llamadasA('POST', '#/cancelar$#'), 'No se llamó a cancelar en el Central');
        $this->assertNotSame('cancelado', $this->central->pedidos[$pedido->rukoz_ref]['estado']);
    }

    public function test_la_cancelacion_automatica_no_toca_una_venta_confirmada(): void
    {
        $pedido = $this->confirmado();
        // Una venta vieja de 10 días: una reserva así se cancelaría; una venta confirmada no.
        Pedido::whereKey($pedido->id)->update(['created_at' => now()->subDays(10)]);

        $this->assertSame(0, Artisan::call('chisperio:cancelar-reservas-viejas'));

        $this->assertSame(EstadoPedido::Confirmado, $pedido->fresh()->estado);
        $this->assertSame([], $this->central->llamadasA('POST', '#/cancelar$#'));
    }

    public function test_la_cancelacion_automatica_tampoco_toca_una_venta_con_estado_pendiente_pero_confirmada(): void
    {
        // Defensa extra: aunque el estado local se hubiera quedado en pendiente, `confirmado_at` la protege.
        $pedido = $this->confirmado();
        Pedido::whereKey($pedido->id)->update(['estado' => EstadoPedido::Pendiente->value, 'rukoz_estado' => 'reservado', 'created_at' => now()->subDays(10)]);

        Artisan::call('chisperio:cancelar-reservas-viejas');

        $this->assertSame([], $this->central->llamadasA('POST', '#/cancelar$#'));
    }

    public function test_la_ficha_muestra_todo_y_marca_que_no_hay_acciones_de_edicion(): void
    {
        $pedido = $this->confirmado();

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.show', $pedido))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Pedidos/Show')
                ->where('pedido.cliente_nombre', 'Cliente')
                ->where('pedido.observaciones', 'Nota original')
                ->where('pedido.rukoz_numero_venta', $pedido->rukoz_numero_venta)
                ->where('pedido.estado', 'confirmado')
                ->where('permisos.es_venta_del_central', true)
                ->where('permisos.puede_editar', false)
                ->where('permisos.puede_confirmar', false)
                ->where('permisos.puede_cancelar', false)
                ->where('permisos.puede_marcar_despachado', false)
                ->where('permisos.puede_volver_a_pendiente', false)
            );
    }

    public function test_la_ficha_de_una_reserva_sin_confirmar_ofrece_confirmar_editar_y_cancelar_pero_no_despachar(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 50]);
        $id = $this->postJson('/checkout', ['cliente_nombre' => 'Cliente', 'items' => [['producto_id' => $producto->id, 'cantidad' => 1]]])->assertCreated()->json('id');

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.show', $id))
            ->assertInertia(fn ($page) => $page
                ->where('permisos.puede_confirmar', true)
                ->where('permisos.puede_editar', true)
                ->where('permisos.puede_cancelar', true)
                ->where('permisos.puede_marcar_despachado', false)
                ->where('permisos.es_venta_del_central', false)
            );
    }

    public function test_un_pedido_viejo_sin_reserva_sigue_editable_y_despachable_como_siempre(): void
    {
        config(['integracion.checkout' => false]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 50]);
        $id = $this->postJson('/checkout', ['cliente_nombre' => 'Cliente', 'items' => [['producto_id' => $producto->id, 'cantidad' => 1]]])->assertCreated()->json('id');
        config(['integracion.checkout' => true]);

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.show', $id))
            ->assertInertia(fn ($page) => $page
                ->where('permisos.puede_confirmar', false)
                ->where('permisos.puede_editar', true)
                ->where('permisos.puede_marcar_despachado', true)
                ->where('permisos.puede_cancelar', true)
            );
    }
}
