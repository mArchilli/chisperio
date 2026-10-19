<?php

namespace Tests\Feature\Rukoz;

use App\Enums\EstadoPedido;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Rukoz\EspejoStock;
use App\Rukoz\EstadoDesdeCentral;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Rukoz\CoreClient\Eventos\PedidoActualizado;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Rukoz\CoreClient\Inbox\RegistroDeInbox;
use Rukoz\CoreClient\Procesamiento\ProcesadorEventos;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/**
 * 11.4 — Los estados que llegan del Central (`pedido.*`) se reflejan en el pedido de la web. Los eventos pasan por el camino
 * real del paquete (inbox → regla de `version` → `PedidoActualizado` → listener), con los `datos` de los fixtures oficiales del
 * Central y los que arma el Central falso al mover una venta.
 */
class EstadosDesdeCentralTest extends TestCase
{
    use RefreshDatabase;

    private CentralDePrueba $central;

    private int $secuencia = 0;

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

    private function reservado(array $extra = []): Pedido
    {
        $producto = Producto::factory()->create(['titulo' => 'Chispa', 'precio' => 1000, 'stock' => 50]);
        $id = $this->postJson('/checkout', ['cliente_nombre' => 'Cliente', 'items' => [['producto_id' => $producto->id, 'cantidad' => 2]], ...$extra])->assertCreated()->json('id');

        return Pedido::findOrFail($id);
    }

    private function confirmado(array $extra = []): Pedido
    {
        $pedido = $this->reservado($extra);

        $this->actingAs(User::factory()->create(['rukoz_vendedor_id' => '7']))
            ->post(route('pedidos.confirmar', $pedido), ['pagos' => [['cuenta' => 'EFECTIVO', 'monto' => 500]], 'envio' => ['forma_envio_id' => 1, 'costo_cobrado' => 0, 'es_gratis' => false, 'transportista_id' => 1]])
            ->assertSessionHasNoErrors();

        return $pedido->fresh();
    }

    /** Entrega un evento como lo haría el webhook o el feed: lo guarda en el inbox y lo procesa. */
    private function entregar(string $evento, array $datos, ?string $id = null): void
    {
        $sobre = ['id' => $id ?? (string) Str::uuid(), 'evento' => $evento, 'secuencia' => ++$this->secuencia, 'creado_at' => now()->toIso8601String(), 'integracion' => 'chisperio', 'datos' => $datos];

        [$fila] = app(RegistroDeInbox::class)->guardar($sobre, json_encode($sobre), 'webhook');
        app(ProcesadorEventos::class)->procesar([$fila]);
    }

    /** El `datos` de un fixture oficial, apuntado a nuestro pedido. */
    private function fixture(string $nombre, Pedido $pedido, array $cambios = []): array
    {
        $datos = json_decode((string) file_get_contents(base_path("tests/fixtures/rukoz/webhook-pedido-{$nombre}.json")), true)['datos'];

        return [...$datos, 'external_ref' => $pedido->rukoz_ref, ...$cambios];
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Cada evento
    // ------------------------------------------------------------------------------------------------------------------

    public function test_confirmar_desde_el_central_se_refleja_en_la_web(): void
    {
        $pedido = $this->reservado();

        $this->entregar('pedido.confirmado', $this->fixture('confirmado', $pedido, ['version' => 2]));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado);
        $this->assertSame('confirmado', $pedido->rukoz_estado);
        $this->assertSame('CHF-000045', $pedido->rukoz_numero_venta);
        $this->assertSame('2026-10-20 14:05:00', $pedido->confirmado_at->utc()->toDateTimeString());
        $this->assertSame(53500.0, (float) $pedido->rukoz_total_venta);
        $this->assertSame(33500.0, (float) $pedido->rukoz_saldo);
        $this->assertSame('Correo Argentino', $pedido->rukoz_transportista);
        $this->assertNull($pedido->confirmado_por, 'Lo confirmó el Central, no un usuario de la web');
        $this->assertFalse($pedido->esEditable());
        $this->assertTrue($pedido->estaConfirmado());
    }

    public function test_empaquetado_despachado_con_seguimiento_y_retirado(): void
    {
        $pedido = $this->confirmado();
        $v = $pedido->rukoz_version;

        $this->entregar('pedido.empaquetado', $this->fixture('empaquetado', $pedido, ['version' => $v + 1]));
        $this->assertSame(EstadoPedido::Empaquetado, $pedido->fresh()->estado);
        $this->assertNotNull($pedido->fresh()->rukoz_empaquetado_at);

        $this->entregar('pedido.despachado', $this->fixture('despachado', $pedido, ['version' => $v + 2, 'numero_seguimiento' => 'AR123', 'url_seguimiento' => 'https://seguimiento.test/AR123']));
        $pedido->refresh();
        $this->assertSame(EstadoPedido::Despachado, $pedido->estado);
        $this->assertSame('2026-10-20 20:30:00', $pedido->despachado_at->utc()->toDateTimeString());
        $this->assertSame('AR123', $pedido->rukoz_numero_seguimiento);
        $this->assertSame('https://seguimiento.test/AR123', $pedido->rukoz_url_seguimiento);

        $this->entregar('pedido.retirado', $this->fixture('retirado', $pedido, ['version' => $v + 3]));
        $pedido->refresh();
        $this->assertSame(EstadoPedido::Entregado, $pedido->estado);
        $this->assertNotNull($pedido->rukoz_retirado_at);
        $this->assertSame(0.0, (float) $pedido->rukoz_saldo);
    }

    public function test_el_envio_y_el_pago_actualizados_refrescan_seguimiento_y_saldo_sin_cambiar_el_estado(): void
    {
        $pedido = $this->confirmado();
        $v = $pedido->rukoz_version;
        $this->entregar('pedido.despachado', $this->fixture('despachado', $pedido, ['version' => $v + 1]));

        $this->entregar('pedido.envio_actualizado', $this->fixture('envio-actualizado', $pedido, ['version' => $v + 2, 'estado' => 'despachado']));
        $this->assertSame('AR123456789', $pedido->fresh()->rukoz_numero_seguimiento);
        $this->entregar('pedido.pago_actualizado', $this->fixture('pago-actualizado', $pedido, ['version' => $v + 3, 'estado' => 'despachado']));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Despachado, $pedido->estado);
        $this->assertSame(0.0, (float) $pedido->rukoz_saldo);
        $this->assertSame(53500.0, (float) $pedido->rukoz_pagado);
    }

    public function test_la_venta_anulada_queda_anulada_con_el_motivo_y_libera_el_cupon_una_sola_vez(): void
    {
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'valor_descuento' => 10, 'limite_usos' => 5]);
        $pedido = $this->confirmado(['codigo_descuento' => 'DIEZ']);
        $this->assertSame(1, $cupon->fresh()->usos_actuales);
        $v = $pedido->rukoz_version;

        $anulado = $this->fixture('anulado', $pedido, ['version' => $v + 1, 'motivo' => 'Pedido duplicado']);
        $this->entregar('pedido.anulado', $anulado);

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Anulado, $pedido->estado);
        $this->assertSame('anulado', $pedido->rukoz_estado);
        $this->assertSame('Pedido duplicado', $pedido->motivo_cancelacion);
        $this->assertNotNull($pedido->rukoz_anulado_at);
        $this->assertSame(0, $cupon->fresh()->usos_actuales, 'El cupo del cupón vuelve');
        $this->assertNotNull($pedido->codigo_descuento_liberado_at);
        $this->assertFalse($pedido->esEditable());

        // Se repite (otro id de evento, misma versión) y se reaplica directo: nada cambia, no se libera dos veces.
        $this->entregar('pedido.anulado', $anulado);
        app(EstadoDesdeCentral::class)->aplicar($pedido->rukoz_ref, $v + 1, 'anulado', $anulado);
        $this->assertSame(0, $cupon->fresh()->usos_actuales);
        $this->assertSame(EstadoPedido::Anulado, $pedido->fresh()->estado);
    }

    public function test_anular_en_el_central_devuelve_el_stock_que_espeja_el_evento_de_stock(): void
    {
        $pedido = $this->confirmado();
        $producto = Producto::query()->first();
        $this->assertSame(50, $producto->stock, 'El stock local nunca se descontó: lo lleva el Central');

        // El Central anula y publica su stock nuevo; la web lo espeja con EspejoStock (11.2).
        $this->entregar('pedido.anulado', $this->fixture('anulado', $pedido, ['version' => $pedido->rukoz_version + 1]));
        $sobre = ['id' => (string) Str::uuid(), 'evento' => 'stock.actualizado', 'secuencia' => ++$this->secuencia, 'datos' => ['completo' => false, 'version' => 500, 'items' => [['tipo' => 'producto', 'id' => (string) $producto->id, 'disponible' => 50, 'a_pedido' => false, 'vinculado' => true, 'aproximado' => false, 'opciones' => null]]]];
        [$fila] = app(RegistroDeInbox::class)->guardar($sobre, json_encode($sobre), 'webhook');
        app(ProcesadorEventos::class)->procesar([$fila]);

        $this->assertSame(50, $producto->fresh()->stock);
        $this->assertSame(EstadoPedido::Anulado, $pedido->fresh()->estado);
    }

    public function test_reserva_liberada_por_el_central_cancela_el_pedido_y_libera_el_cupon(): void
    {
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'valor_descuento' => 10, 'limite_usos' => 5]);
        $pedido = $this->reservado(['codigo_descuento' => 'DIEZ']);
        $this->assertSame(1, $cupon->fresh()->usos_actuales);

        $this->entregar('pedido.reserva_liberada', $this->fixture('reserva-liberada', $pedido, ['version' => 2, 'motivo' => 'Sin confirmar hace 3 semanas']));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->estado);
        $this->assertSame('cancelado', $pedido->rukoz_estado);
        $this->assertSame('Sin confirmar hace 3 semanas', $pedido->motivo_cancelacion);
        $this->assertSame(0, $cupon->fresh()->usos_actuales);
    }

    public function test_volver_atras_en_el_central_limpia_las_fechas_del_estado_dejado(): void
    {
        $pedido = $this->confirmado();
        $v = $pedido->rukoz_version;
        $this->entregar('pedido.despachado', $this->fixture('despachado', $pedido, ['version' => $v + 1]));
        $this->assertNotNull($pedido->fresh()->despachado_at);

        $this->entregar('pedido.estado_revertido', $this->fixture('estado-revertido', $pedido, ['version' => $v + 2]));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado);
        $this->assertNull($pedido->despachado_at);
        $this->assertNull($pedido->rukoz_empaquetado_at);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Repetidos, desordenados y de otros
    // ------------------------------------------------------------------------------------------------------------------

    public function test_un_evento_repetido_no_cambia_nada(): void
    {
        $pedido = $this->confirmado();
        $datos = $this->fixture('despachado', $pedido, ['version' => $pedido->rukoz_version + 1]);

        $this->entregar('pedido.despachado', $datos, 'evento-1');
        $despues = $pedido->fresh()->only(['estado', 'rukoz_version', 'despachado_at', 'updated_at']);
        $this->entregar('pedido.despachado', $datos, 'evento-1'); // mismo id: lo descarta el inbox
        $this->entregar('pedido.despachado', $datos, 'evento-2'); // otro id, misma versión: lo ignora la regla de versión

        $this->assertEquals($despues, $pedido->fresh()->only(['estado', 'rukoz_version', 'despachado_at', 'updated_at']));
    }

    public function test_eventos_desordenados_gana_la_version_mas_nueva(): void
    {
        $pedido = $this->confirmado();
        $v = $pedido->rukoz_version;

        // Llega el despachado (v+2) antes que el empaquetado (v+1).
        $this->entregar('pedido.despachado', $this->fixture('despachado', $pedido, ['version' => $v + 2]));
        $this->entregar('pedido.empaquetado', $this->fixture('empaquetado', $pedido, ['version' => $v + 1]));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Despachado, $pedido->estado, 'El estado viejo no pisa al nuevo');
        $this->assertSame($v + 2, $pedido->rukoz_version);
    }

    public function test_el_listener_descarta_una_version_menor_que_la_guardada_aunque_el_paquete_no_lo_haya_hecho(): void
    {
        $pedido = $this->confirmado();
        $v = $pedido->rukoz_version;
        $this->entregar('pedido.despachado', $this->fixture('despachado', $pedido, ['version' => $v + 5]));

        $resultado = app(EstadoDesdeCentral::class)->aplicar($pedido->rukoz_ref, $v + 1, 'empaquetado', $this->fixture('empaquetado', $pedido));

        $this->assertNull($resultado);
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
    }

    public function test_un_evento_de_un_pedido_que_la_web_no_conoce_se_ignora(): void
    {
        $this->entregar('pedido.confirmado', [...$this->fixture('confirmado', $this->reservado()), 'external_ref' => 'OTRA-WEB-1']);

        $this->assertSame(0, Pedido::where('estado', EstadoPedido::Confirmado->value)->count());
    }

    public function test_un_pedido_cancelado_en_la_web_no_se_reabre_por_un_evento(): void
    {
        $pedido = $this->reservado();
        $this->actingAs(User::factory()->create())->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'cancelado'])->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);

        $this->entregar('pedido.confirmado', $this->fixture('confirmado', $pedido, ['version' => 9]));

        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertNull($pedido->fresh()->confirmado_at);
    }

    public function test_confirmar_en_la_web_y_despues_el_evento_de_confirmado_no_duplica_ni_pisa(): void
    {
        $pedido = $this->confirmado();
        $numero = $pedido->rukoz_numero_venta;
        $porUsuario = $pedido->confirmado_por;

        // El webhook de la confirmación (misma versión que devolvió `confirmar`).
        $this->entregar('pedido.confirmado', $this->central->datosDeEvento($pedido->rukoz_ref));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado);
        $this->assertSame($numero, $pedido->rukoz_numero_venta);
        $this->assertSame($porUsuario, $pedido->confirmado_por, 'Quién confirmó no se pierde');
    }

    public function test_los_estados_que_mueve_el_central_falso_llegan_igual_que_los_reales(): void
    {
        $pedido = $this->confirmado();
        $ref = $pedido->rukoz_ref;

        $this->entregar('pedido.empaquetado', $this->central->avanzar($ref, 'empaquetado', ['empaquetado_at' => now()->toIso8601String()]));
        $this->assertSame(EstadoPedido::Empaquetado, $pedido->fresh()->estado);

        $this->entregar('pedido.despachado', $this->central->avanzar($ref, 'despachado', ['despachado_at' => now()->toIso8601String(), 'numero_seguimiento' => 'XYZ']));
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
        $this->assertSame('XYZ', $pedido->fresh()->rukoz_numero_seguimiento);

        $this->entregar('pedido.anulado', $this->central->avanzar($ref, 'anulado', ['anulado_at' => now()->toIso8601String(), 'motivo' => 'Error de carga']));
        $this->assertSame(EstadoPedido::Anulado, $pedido->fresh()->estado);
        $this->assertSame('Error de carga', $pedido->fresh()->motivo_cancelacion);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Interruptores
    // ------------------------------------------------------------------------------------------------------------------

    public function test_la_tabla_de_estados_del_central_y_su_equivalente_en_la_web(): void
    {
        $this->assertSame(EstadoPedido::Confirmado, EstadoPedido::desdeCentral('confirmado'));
        $this->assertSame(EstadoPedido::Empaquetado, EstadoPedido::desdeCentral('empaquetado'));
        $this->assertSame(EstadoPedido::Despachado, EstadoPedido::desdeCentral('despachado'));
        $this->assertSame(EstadoPedido::Entregado, EstadoPedido::desdeCentral('retirado'));
        $this->assertSame(EstadoPedido::Anulado, EstadoPedido::desdeCentral('anulado'));
        $this->assertSame(EstadoPedido::Cancelado, EstadoPedido::desdeCentral('cancelado'));
        $this->assertNull(EstadoPedido::desdeCentral('reservado'));
        $this->assertNull(EstadoPedido::desdeCentral('requiere_revision'));
        $this->assertNull(EstadoPedido::desdeCentral('algo_nuevo'));
    }

    public function test_el_listener_solo_se_registra_con_la_confirmacion_encendida(): void
    {
        // En el arranque normal (la config de los tests tiene la confirmación apagada) AppServiceProvider no lo registra.
        $this->refreshApplication();

        $this->assertFalse(app('events')->hasListeners(PedidoActualizado::class));
    }
}
