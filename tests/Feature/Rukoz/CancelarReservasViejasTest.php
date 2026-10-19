<?php

namespace Tests\Feature\Rukoz;

use App\Enums\EstadoPedido;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\Producto;
use App\Rukoz\EspejoStock;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Rukoz\CoreClient\Compensaciones\Compensacion;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/**
 * 11.3 — `chisperio:cancelar-reservas-viejas`: las reservas del Central no vencen, así que la web cancela sola los pedidos con
 * reserva que llevan más de PEDIDOS_CANCELAR_DIAS días sin confirmar.
 */
class CancelarReservasViejasTest extends TestCase
{
    use RefreshDatabase;

    private const MOTIVO = 'Cancelado automáticamente (3 días sin confirmar)';

    private CentralDePrueba $central;

    protected function setUp(): void
    {
        parent::setUp();

        $this->central = CentralDePrueba::instalar();
        Carbon::setTestNow('2026-10-20 12:00:00');
    }

    protected function tearDown(): void
    {
        $this->assertSame([], $this->central->erroresDeContrato);
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Un pedido con reserva en el Central, creado hace `$edad` (un Carbon relativo a «ahora»). */
    private function pedidoConReserva(Carbon $creado, array $extra = []): Pedido
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $respuesta = $this->postJson('/checkout', [
            'cliente_nombre' => 'PRUEBA 11.3', 'cliente_telefono' => '1100000000',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]], ...$extra,
        ])->assertCreated();

        DB::table('pedidos')->where('id', $respuesta->json('id'))->update(['created_at' => $creado]);

        return Pedido::findOrFail($respuesta->json('id'));
    }

    public function test_el_limite_de_los_3_dias_es_exacto(): void
    {
        $justo = $this->pedidoConReserva(now()->subDays(3));
        $pasado = $this->pedidoConReserva(now()->subDays(3)->subSecond());
        $reciente = $this->pedidoConReserva(now()->subDays(2));

        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();

        $this->assertSame(EstadoPedido::Pendiente, $justo->fresh()->estado, 'Con exactamente 3 días todavía no es «más de 3 días»');
        $this->assertSame(EstadoPedido::Pendiente, $reciente->fresh()->estado);
        $this->assertSame(EstadoPedido::Cancelado, $pasado->fresh()->estado);
        $this->assertSame('cancelado', $pasado->fresh()->rukoz_estado);
        $this->assertSame(self::MOTIVO, $pasado->fresh()->motivo_cancelacion);

        // En el Central se canceló esa reserva, con el motivo, y las otras siguen vivas.
        $this->assertSame('cancelado', $this->central->pedidos[$pasado->rukoz_ref]['estado']);
        $this->assertSame(self::MOTIVO, $this->central->pedidos[$pasado->rukoz_ref]['motivo']);
        $this->assertSame('reservado', $this->central->pedidos[$justo->rukoz_ref]['estado']);
        $this->assertSame('reservado', $this->central->pedidos[$reciente->rukoz_ref]['estado']);
    }

    public function test_un_segundo_despues_del_limite_ya_se_cancela(): void
    {
        $pedido = $this->pedidoConReserva(now()->subDays(3));

        Carbon::setTestNow(now()->addSecond());
        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();

        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
    }

    public function test_dry_run_lista_pero_no_cancela_ni_llama_al_central(): void
    {
        $viejo = $this->pedidoConReserva(now()->subDays(10));
        $llamadas = count($this->central->llamadas);

        $this->artisan('chisperio:cancelar-reservas-viejas', ['--dry-run' => true])
            ->expectsOutputToContain($viejo->rukoz_ref)
            ->expectsOutputToContain('dry-run')
            ->assertSuccessful();

        $this->assertSame(EstadoPedido::Pendiente, $viejo->fresh()->estado);
        $this->assertSame('reservado', $viejo->fresh()->rukoz_estado);
        $this->assertCount($llamadas, $this->central->llamadas);
        $this->assertCount(1, $this->central->vivos());
    }

    public function test_los_pedidos_sin_rukoz_ref_no_se_tocan_nunca(): void
    {
        config(['integracion.checkout' => false]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $id = $this->postJson('/checkout', ['cliente_nombre' => 'Viejo', 'items' => [['producto_id' => $producto->id, 'cantidad' => 1]]])->assertCreated()->json('id');
        DB::table('pedidos')->where('id', $id)->update(['created_at' => now()->subDays(30)]);
        config(['integracion.checkout' => true]);

        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();

        $this->assertSame(EstadoPedido::Pendiente, Pedido::findOrFail($id)->estado);
        $this->assertSame([], $this->central->llamadas);
        $this->assertSame(9, $producto->fresh()->stock);
    }

    public function test_solo_cancela_los_pendientes_con_reserva_abierta(): void
    {
        $despachado = $this->pedidoConReserva(now()->subDays(10));
        $despachado->update(['estado' => EstadoPedido::Despachado, 'despachado_at' => now()]);
        $yaCancelado = $this->pedidoConReserva(now()->subDays(10));
        $yaCancelado->update(['estado' => EstadoPedido::Cancelado, 'rukoz_estado' => 'cancelado']);
        $llamadas = count($this->central->llamadas);

        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();

        $this->assertSame(EstadoPedido::Despachado, $despachado->fresh()->estado);
        $this->assertCount($llamadas, $this->central->llamadas, 'No hay nada que cancelar: no se llama al Central');
    }

    public function test_los_dias_se_configuran(): void
    {
        config(['integracion.cancelar_dias' => 7]);
        $seisDias = $this->pedidoConReserva(now()->subDays(6));
        $ochoDias = $this->pedidoConReserva(now()->subDays(8));

        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();

        $this->assertSame(EstadoPedido::Pendiente, $seisDias->fresh()->estado);
        $this->assertSame(EstadoPedido::Cancelado, $ochoDias->fresh()->estado);
        $this->assertSame('Cancelado automáticamente (7 días sin confirmar)', $ochoDias->fresh()->motivo_cancelacion);
    }

    public function test_libera_el_cupon_una_sola_vez(): void
    {
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'limite_usos' => 5]);
        $pedido = $this->pedidoConReserva(now()->subDays(4), ['codigo_descuento' => 'DIEZ']);
        $this->assertSame(1, $cupon->fresh()->usos_actuales);

        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();
        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful(); // una segunda corrida no vuelve a tocar nada

        $this->assertSame(0, $cupon->fresh()->usos_actuales);
        $this->assertNotNull($pedido->fresh()->codigo_descuento_liberado_at);
    }

    public function test_con_el_central_caido_cancela_local_y_deja_la_cancelacion_en_compensacion(): void
    {
        $pedido = $this->pedidoConReserva(now()->subDays(4));
        $this->central->caido = true;

        $this->artisan('chisperio:cancelar-reservas-viejas')->assertSuccessful();

        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame('cancelacion_pendiente', $pedido->fresh()->rukoz_estado);
        $this->assertSame(1, Compensacion::query()->pendientes()->where('tipo', Compensacion::CANCELAR)->count());
    }

    public function test_con_la_integracion_apagada_no_cancela_nada(): void
    {
        $pedido = $this->pedidoConReserva(now()->subDays(10));
        config(['rukoz.habilitada' => false]);

        $this->artisan('chisperio:cancelar-reservas-viejas')->expectsOutputToContain('RUKOZ_INTEGRACION está apagado')->assertSuccessful();

        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
    }

    public function test_esta_programado_cada_hora_solo_con_la_integracion_encendida_y_el_cargado_local_una_vez_por_dia(): void
    {
        $eventos = collect(app(Schedule::class)->events());
        $cancelar = $eventos->first(fn ($e) => str_contains($e->command, 'chisperio:cancelar-reservas-viejas'));
        $cargar = $eventos->first(fn ($e) => str_contains($e->command, 'chisperio:stock-cargar') && str_contains($e->command, '--local'));

        $this->assertNotNull($cancelar);
        $this->assertSame('0 * * * *', $cancelar->expression);
        $this->assertNotNull($cargar);
        $this->assertSame('45 3 * * *', $cargar->expression);

        // Encendida la integración (y el espejo) corren; apagada, no.
        $this->assertTrue($cancelar->filtersPass($this->app));
        $this->assertTrue($cargar->filtersPass($this->app));

        config(['rukoz.habilitada' => false]);
        $this->assertFalse($cancelar->filtersPass($this->app));
        $this->assertFalse($cargar->filtersPass($this->app));

        config(['rukoz.habilitada' => true, 'integracion.stock' => false]);
        $this->assertTrue($cancelar->filtersPass($this->app));
        $this->assertFalse($cargar->filtersPass($this->app), 'El cargado diario del espejo es solo con INTEGRACION_STOCK');
        $this->assertFalse(EspejoStock::activo());
    }
}
