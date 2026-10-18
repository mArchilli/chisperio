<?php

namespace Tests\Feature\Rukoz;

use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/** 11.3 — `chisperio:integracion-estado` y la regla de encendido del checkout. */
class IntegracionEstadoTest extends TestCase
{
    use RefreshDatabase;

    public function test_con_todo_en_orden_informa_el_ping_y_sale_con_codigo_0(): void
    {
        $central = CentralDePrueba::instalar();

        $this->artisan('chisperio:integracion-estado')
            ->expectsOutputToContain('el checkout USA el Central')
            ->expectsOutputToContain('OK')
            ->expectsOutputToContain('Ítems activos sin espejo')
            ->expectsOutputToContain('Reservas pendientes de compensar')
            ->assertSuccessful();

        $this->assertCount(1, $central->llamadasA('GET', '#^/ping$#'));
    }

    public function test_checkout_sin_stock_lo_informa_y_sale_con_codigo_1(): void
    {
        CentralDePrueba::instalar();
        config(['integracion.stock' => false]);

        $codigo = Artisan::call('chisperio:integracion-estado');
        $salida = preg_replace('/\s+/', ' ', Artisan::output());

        $this->assertSame(1, $codigo);
        $this->assertStringContainsString('el checkout NO usa el Central', $salida);
        $this->assertStringContainsString('falta INTEGRACION_STOCK', $salida);
    }

    public function test_checkout_sin_la_integracion_general_lo_informa(): void
    {
        config(['rukoz.habilitada' => false, 'integracion.stock' => true, 'integracion.checkout' => true]);

        $this->artisan('chisperio:integracion-estado')
            ->expectsOutputToContain('falta RUKOZ_INTEGRACION')
            ->assertFailed();
    }

    public function test_todo_apagado_no_es_un_problema(): void
    {
        config(['rukoz.habilitada' => false, 'integracion.stock' => false, 'integracion.checkout' => false]);

        $this->artisan('chisperio:integracion-estado')
            ->expectsOutputToContain('omitido (RUKOZ_INTEGRACION apagado)')
            ->assertSuccessful();
    }

    public function test_un_central_que_no_responde_sale_con_codigo_1(): void
    {
        $central = CentralDePrueba::instalar();
        $central->caido = true;

        $this->artisan('chisperio:integracion-estado')->expectsOutputToContain('FALLA')->assertFailed();
    }

    public function test_cuenta_los_items_sin_espejo_y_las_reservas_pendientes_de_compensar(): void
    {
        $central = CentralDePrueba::instalar();
        Producto::factory()->create(['titulo' => 'Sin espejo', 'stock' => 3, 'is_active' => true]); // no hay fila en rukoz_stock

        // Una cancelación que quedó para reintentar.
        $producto = Producto::factory()->create(['precio' => 1000]);
        $id = $this->postJson('/checkout', ['cliente_nombre' => 'X', 'items' => [['producto_id' => $producto->id, 'cantidad' => 1]]])->json('id');
        $central->caido = true;
        $this->actingAs(\App\Models\User::factory()->create())->patch(route('pedidos.cambiar-estado', $id), ['estado' => 'cancelado'])->assertSessionHasNoErrors();
        $this->assertSame(Pedido::RESERVA_CANCELACION_PENDIENTE, Pedido::findOrFail($id)->rukoz_estado);

        $this->artisan('chisperio:integracion-estado')
            ->expectsOutputToContain('cancelar: 1')
            ->expectsOutputToContain('Pedidos cancelados esperando que el Central confirme')
            ->assertFailed(); // hay ítems sin espejo con el checkout encendido
    }
}
