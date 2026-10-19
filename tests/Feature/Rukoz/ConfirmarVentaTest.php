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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Rukoz\CoreClient\Eventos\PedidoActualizado;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/**
 * 11.4 — «Confirmar venta» desde el admin: `Rukoz::confirmar` contra el Central falso (cliente REAL del paquete, cada body
 * validado contra el contrato `ContratoConfirmacionCentral`). Cubre: sin pago, uno y dos pagos, envío, cupón, vendedor sin mapeo,
 * doble clic, Central caído, respuesta perdida, rechazo y los interruptores apagados.
 */
class ConfirmarVentaTest extends TestCase
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
        $this->assertSame([], $this->central->erroresDeContrato, 'La web mandó un body que el Central rechazaría');

        parent::tearDown();
    }

    private function vendedor(array $extra = []): User
    {
        return User::factory()->create(['rukoz_vendedor_id' => '7', ...$extra]);
    }

    private function comprar(int $cantidad = 2, int $precio = 1000, array $extra = []): Pedido
    {
        $producto = Producto::factory()->create(['titulo' => 'Chispa', 'precio' => $precio, 'stock' => 50]);
        $respuesta = $this->postJson('/checkout', ['cliente_nombre' => 'Cliente de prueba', 'cliente_telefono' => '1155550000', 'items' => [['producto_id' => $producto->id, 'cantidad' => $cantidad]], ...$extra]);
        $respuesta->assertCreated();

        return Pedido::findOrFail($respuesta->json('id'));
    }

    private function envio(array $extra = []): array
    {
        return ['forma_envio_id' => 1, 'costo_cobrado' => 5000, 'es_gratis' => false, 'transportista_id' => 1, ...$extra];
    }

    private function confirmar(Pedido $pedido, array $datos = [], ?User $usuario = null)
    {
        return $this->actingAs($usuario ?? $this->vendedor())->post(route('pedidos.confirmar', $pedido), ['pagos' => [], 'envio' => $this->envio(), ...$datos]);
    }

    private function posts(): array
    {
        return $this->central->llamadasA('POST', '#^/pedidos/[^/]+/confirmar$#');
    }

    // ------------------------------------------------------------------------------------------------------------------
    // El camino feliz
    // ------------------------------------------------------------------------------------------------------------------

    public function test_confirmar_sin_pago_deja_la_venta_con_saldo_y_el_pedido_confirmado(): void
    {
        $pedido = $this->comprar();
        $usuario = $this->vendedor();

        $this->confirmar($pedido, [], $usuario)
            ->assertRedirect(route('pedidos.show', $pedido))
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success');

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado);
        $this->assertSame('confirmado', $pedido->rukoz_estado);
        $this->assertNotNull($pedido->confirmado_at);
        $this->assertSame(2, $pedido->rukoz_version);
        $this->assertSame('TST-000001', $pedido->rukoz_numero_venta);
        $this->assertSame($usuario->id, (int) $pedido->confirmado_por);
        // 2 x 1000 + 5000 de envío, sin pagos: queda todo como saldo.
        $this->assertSame(7000.0, (float) $pedido->rukoz_total_venta);
        $this->assertSame(0.0, (float) $pedido->rukoz_pagado);
        $this->assertSame(7000.0, (float) $pedido->rukoz_saldo);
        $this->assertSame(5000.0, (float) $pedido->envio_costo_cobrado);

        // Lo que viajó: vendedor mapeado, sin pagos, el envío, sin `descuento`.
        $body = $this->posts()[0][2];
        $this->assertSame('7', $body['vendedor']['id']);
        $this->assertSame([], $body['pagos']);
        $this->assertSame(['forma_envio_id' => 1, 'costo_cobrado' => 5000, 'es_gratis' => false, 'transportista_id' => 1], $body['envio']);
        $this->assertArrayNotHasKey('descuento', $body);
        $this->assertArrayHasKey('confirmado_at', $body);
    }

    public function test_confirmar_con_un_pago_registra_cuenta_medio_y_monto(): void
    {
        $pedido = $this->comprar();

        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'DIGITAL-CHISPERIO', 'medio' => 'transferencia', 'monto' => 3000]]])
            ->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado);
        $this->assertSame(3000.0, (float) $pedido->rukoz_pagado);
        $this->assertSame(4000.0, (float) $pedido->rukoz_saldo);

        $pago = $this->posts()[0][2]['pagos'];
        $this->assertCount(1, $pago);
        $this->assertSame(['cuenta' => 'DIGITAL-CHISPERIO', 'medio' => 'transferencia', 'monto' => 3000], array_diff_key($pago[0], ['fecha' => 1]));
        // La fecha del pago es la misma hora de la confirmación (fija en el primer intento).
        $this->assertSame($this->posts()[0][2]['confirmado_at'], $pago[0]['fecha']);
    }

    public function test_confirmar_con_dos_pagos_los_manda_en_orden_y_suma_lo_pagado(): void
    {
        $pedido = $this->comprar();

        $this->confirmar($pedido, ['pagos' => [
            ['cuenta' => 'DIGITAL-CHISPERIO', 'medio' => 'transferencia', 'monto' => 2000],
            ['cuenta' => 'EFECTIVO', 'medio' => 'efectivo', 'monto' => 5000],
        ]])->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(7000.0, (float) $pedido->rukoz_pagado);
        $this->assertSame(0.0, (float) $pedido->rukoz_saldo);
        $this->assertSame(['DIGITAL-CHISPERIO', 'EFECTIVO'], array_column($this->posts()[0][2]['pagos'], 'cuenta'));
    }

    public function test_el_envio_gratis_va_con_costo_cero(): void
    {
        $pedido = $this->comprar(1, 1000);

        $this->confirmar($pedido, ['envio' => $this->envio(['costo_cobrado' => 0, 'es_gratis' => true])])->assertSessionHasNoErrors();

        $this->assertSame(['forma_envio_id' => 1, 'costo_cobrado' => 0, 'es_gratis' => true, 'transportista_id' => 1], $this->posts()[0][2]['envio']);
        $this->assertSame(1000.0, (float) $pedido->fresh()->rukoz_total_venta);
    }

    public function test_un_retiro_sin_costo_ni_transportista_se_confirma(): void
    {
        $pedido = $this->comprar();

        $this->confirmar($pedido, ['envio' => ['forma_envio_id' => 2, 'costo_cobrado' => 0, 'es_gratis' => false]])->assertSessionHasNoErrors();

        $this->assertSame(EstadoPedido::Confirmado, $pedido->fresh()->estado);
        $this->assertArrayNotHasKey('transportista_id', $this->posts()[0][2]['envio']);
    }

    public function test_el_descuento_del_cupon_ya_viaja_en_el_total_y_no_se_manda_otra_vez(): void
    {
        CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'valor_descuento' => 10, 'limite_usos' => 5]);
        $pedido = $this->comprar(2, 1000, ['codigo_descuento' => 'DIEZ']);
        $this->assertSame(1800.0, (float) $pedido->total);

        $this->confirmar($pedido)->assertSessionHasNoErrors();

        $this->assertArrayNotHasKey('descuento', $this->posts()[0][2]);
        // La venta es: productos con cupón (1800) + envío (5000).
        $this->assertSame(6800.0, (float) $pedido->fresh()->rukoz_total_venta);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // El vendedor
    // ------------------------------------------------------------------------------------------------------------------

    public function test_un_usuario_sin_vendedor_asignado_no_puede_confirmar_y_el_pedido_no_cambia(): void
    {
        $pedido = $this->comprar();
        $sinMapeo = User::factory()->create(['rukoz_vendedor_id' => null, 'name' => 'Ana Sin Mapeo']);

        $this->confirmar($pedido, [], $sinMapeo)->assertSessionHasErrors('confirmacion');

        $mensaje = session('errors')->first('confirmacion');
        $this->assertStringContainsString('Ana Sin Mapeo', $mensaje);
        $this->assertStringContainsString('vendedor del Sistema Central', $mensaje);
        $this->assertSame([], $this->posts(), 'Ni siquiera se llamó al Central');

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Pendiente, $pedido->estado);
        $this->assertNull($pedido->confirmado_at);
        $this->assertNull($pedido->confirmando_at, 'Sin mapeo no se fija ni la hora del intento');
    }

    public function test_si_el_central_no_tiene_asignado_al_vendedor_se_explica_y_nada_cambia(): void
    {
        $pedido = $this->comprar();
        $this->central->vendedoresAsignados = ['99'];

        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');

        $this->assertStringContainsString('todavía no está habilitado en el Sistema Central', session('errors')->first('confirmacion'));
        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
        $this->assertNull($pedido->fresh()->confirmado_at);
    }

    public function test_un_admin_puede_confirmar_a_nombre_de_otro_vendedor_y_un_vendedor_no(): void
    {
        $pedido = $this->comprar();
        $otro = User::factory()->vendedor()->create(['rukoz_vendedor_id' => '7', 'name' => 'Lucas']);
        $admin = User::factory()->create(['rukoz_vendedor_id' => null]);

        $this->confirmar($pedido, ['vendedor_id' => $otro->id], $admin)->assertSessionHasNoErrors();

        $this->assertSame('7', $this->posts()[0][2]['vendedor']['id']);
        $this->assertSame('Lucas', $this->posts()[0][2]['vendedor']['nombre']);
        $this->assertSame($admin->id, (int) $pedido->fresh()->confirmado_por);

        // Un vendedor (rol) no confirma a nombre de otro.
        $pedido2 = $this->comprar();
        $vendedor = User::factory()->vendedor()->create(['rukoz_vendedor_id' => '7']);
        $this->confirmar($pedido2, ['vendedor_id' => $admin->id], $vendedor)->assertSessionHasErrors('confirmacion');
        $this->assertSame(EstadoPedido::Pendiente, $pedido2->fresh()->estado);
    }

    public function test_un_vendedor_de_otra_sucursal_no_puede_confirmar(): void
    {
        $pedido = $this->comprar(); // sucursal Buenos Aires (default)
        $otraSucursal = User::factory()->vendedor()->create(['sucursal' => 'cordoba', 'rukoz_vendedor_id' => '7']);

        $this->confirmar($pedido, [], $otraSucursal)->assertForbidden();

        $this->assertSame([], $this->posts());
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Idempotencia y fallas
    // ------------------------------------------------------------------------------------------------------------------

    public function test_doble_clic_es_una_sola_venta(): void
    {
        $pedido = $this->comprar();
        $usuario = $this->vendedor();

        $this->confirmar($pedido, [], $usuario)->assertSessionHasNoErrors();
        $this->confirmar($pedido, [], $usuario)->assertSessionHasNoErrors();

        $this->assertCount(1, $this->posts(), 'El segundo clic no llega al Central');
        $this->assertStringContainsString('ya estaba confirmado', session('success'));
        $this->assertSame('TST-000001', $pedido->fresh()->rukoz_numero_venta);
    }

    public function test_dos_clics_simultaneos_se_serializan_con_un_lock_por_pedido(): void
    {
        $pedido = $this->comprar();

        // Otro request ya está confirmando este pedido (tiene el lock).
        $lock = Cache::lock('rukoz:confirmar:'.$pedido->id, 30);
        $this->assertTrue($lock->get());

        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');
        $this->assertStringContainsString('se está confirmando', session('errors')->first('confirmacion'));
        $this->assertSame([], $this->posts());

        $lock->release();
        $this->confirmar($pedido)->assertSessionHasNoErrors();
        $this->assertCount(1, $this->posts());
    }

    public function test_si_el_central_esta_caido_no_se_confirma_nada_y_el_reintento_lleva_los_mismos_bytes(): void
    {
        $pedido = $this->comprar();
        $usuario = $this->vendedor();
        $datos = ['pagos' => [['cuenta' => 'EFECTIVO', 'medio' => 'efectivo', 'monto' => 1000]]];
        $this->central->caido = true;

        $this->confirmar($pedido, $datos, $usuario)->assertSessionHasErrors('confirmacion');

        $this->assertStringContainsString('No pudimos comunicarnos con el Sistema Central', session('errors')->first('confirmacion'));
        $pedido->refresh();
        $this->assertSame(EstadoPedido::Pendiente, $pedido->estado);
        $this->assertNull($pedido->confirmado_at);
        $this->assertSame('reservado', $pedido->rukoz_estado);
        $this->assertNotNull($pedido->confirmando_at, 'La hora del intento queda fija para el reintento');

        $this->central->caido = false;
        $this->confirmar($pedido, $datos, $usuario)->assertSessionHasNoErrors();

        $this->assertSame(EstadoPedido::Confirmado, $pedido->fresh()->estado);
        $bodies = array_map(fn ($llamada) => json_encode($llamada[2]), $this->posts());
        $this->assertCount(2, $bodies);
        $this->assertSame($bodies[0], $bodies[1], 'Un reintento tiene que ser idéntico (misma hora, mismos pagos)');
    }

    public function test_si_la_respuesta_se_pierde_el_reintento_recupera_la_misma_venta(): void
    {
        $pedido = $this->comprar();
        $this->central->perderRespuestaDeConfirmar = true;

        // El Central procesó la venta pero la web no se enteró.
        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');
        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
        $this->assertSame('confirmado', $this->central->pedidos[$pedido->rukoz_ref]['estado']);

        $this->central->perderRespuestaDeConfirmar = false;
        $this->confirmar($pedido)->assertSessionHasNoErrors();

        $this->assertSame(EstadoPedido::Confirmado, $pedido->fresh()->estado);
        $this->assertSame('TST-000001', $pedido->fresh()->rukoz_numero_venta, 'Es la misma venta: no se creó otra');
    }

    public function test_si_el_central_rechaza_se_muestra_su_mensaje_y_el_pedido_no_cambia(): void
    {
        $pedido = $this->comprar();
        $this->central->rechazarConfirmacion = true;

        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');

        $this->assertStringContainsString('el contenido del pedido cambió', session('errors')->first('confirmacion'));
        $pedido->refresh();
        $this->assertSame(EstadoPedido::Pendiente, $pedido->estado);
        $this->assertNull($pedido->confirmado_at);
        $this->assertNull($pedido->rukoz_numero_venta);
        $this->assertSame('reservado', $pedido->rukoz_estado);
        $this->assertSame(1, $pedido->rukoz_version);
    }

    public function test_si_el_central_ya_lo_tenia_confirmado_con_otros_datos_se_trae_su_estado(): void
    {
        $pedido = $this->comprar();

        // Alguien lo confirmó en el panel del Central, con otro pago, y la web no se enteró.
        $this->central->confirmaciones[$pedido->rukoz_ref] = ['vendedor' => ['id' => '7'], 'pagos' => [], 'envio' => $this->envio(['costo_cobrado' => 123]), 'confirmado_at' => now()->toIso8601String()];
        $this->central->pedidos[$pedido->rukoz_ref]['estado'] = 'confirmado';
        $this->central->pedidos[$pedido->rukoz_ref]['version'] = 2;
        $this->central->pedidos[$pedido->rukoz_ref]['venta'] = ['numero_venta' => 'CEN-000009', 'total' => 2123, 'pagado' => 0, 'saldo' => 2123, 'confirmado_at' => now()->toIso8601String()];

        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');

        $this->assertStringContainsString('ya estaba confirmado en el Sistema Central', session('errors')->first('confirmacion'));
        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado, 'Se reconcilió con el estado real del Central');
        $this->assertSame('CEN-000009', $pedido->rukoz_numero_venta);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Validaciones locales (antes de llamar al Central)
    // ------------------------------------------------------------------------------------------------------------------

    public function test_los_pagos_no_pueden_superar_el_total_de_la_venta(): void
    {
        $pedido = $this->comprar(); // 2000 + 5000 de envío

        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'EFECTIVO', 'monto' => 7000.5]]])->assertSessionHasErrors('pagos');

        $this->assertSame([], $this->posts());
        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
    }

    public function test_cuenta_o_forma_de_envio_inexistente_se_rechaza_antes_de_llamar_al_central(): void
    {
        $pedido = $this->comprar();

        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'NO-EXISTE', 'monto' => 100]]])->assertSessionHasErrors('pagos.0.cuenta');
        $this->confirmar($pedido, ['envio' => $this->envio(['forma_envio_id' => 999])])->assertSessionHasErrors('envio.forma_envio_id');
        $this->confirmar($pedido, ['envio' => ['forma_envio_id' => 2, 'costo_cobrado' => 100]])->assertSessionHasErrors('envio.costo_cobrado'); // un retiro no lleva costo
        $this->confirmar($pedido, ['envio' => $this->envio(['es_gratis' => true])])->assertSessionHasErrors('envio.costo_cobrado'); // gratis con costo
        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'EFECTIVO', 'monto' => 0]]])->assertSessionHasErrors('pagos.0.monto');

        $this->assertSame([], $this->posts());
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Interruptores apagados y pedidos viejos
    // ------------------------------------------------------------------------------------------------------------------

    public function test_con_el_interruptor_apagado_no_se_confirma_y_el_flujo_de_siempre_sigue(): void
    {
        $pedido = $this->comprar();
        config(['integracion.confirmacion' => false]);

        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');
        $this->assertSame([], $this->posts());
        $this->assertFalse($pedido->fresh()->puedeConfirmarse());

        // Sin la confirmación, el «despachado» manual de la 11.3 sigue funcionando.
        $this->actingAs(User::factory()->create())->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'despachado'])->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
    }

    public function test_un_pedido_viejo_sin_reserva_en_el_central_no_se_confirma_y_sigue_con_su_flujo(): void
    {
        config(['integracion.checkout' => false]);
        $pedido = $this->comprar();
        config(['integracion.checkout' => true]);
        $this->assertNull($pedido->rukoz_ref);

        $this->confirmar($pedido)->assertSessionHasErrors('confirmacion');
        $this->assertSame([], $this->posts());

        $this->actingAs(User::factory()->create())->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'despachado'])->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
    }

    public function test_con_la_confirmacion_encendida_el_despachado_manual_de_un_pedido_del_central_se_reemplaza_por_confirmar(): void
    {
        $pedido = $this->comprar();

        $this->actingAs(User::factory()->create())->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'despachado'])->assertSessionHasErrors('estado');

        $this->assertStringContainsString('Confirmar venta', session('errors')->first('estado'));
        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Datos del modal
    // ------------------------------------------------------------------------------------------------------------------

    public function test_los_datos_del_modal_traen_cuentas_formas_de_envio_resumen_con_notas_y_vendedor(): void
    {
        $pedido = $this->comprar();
        $usuario = User::factory()->vendedor()->create(['rukoz_vendedor_id' => '7']);

        $json = $this->actingAs($usuario)->getJson(route('pedidos.confirmacion', $pedido))->assertOk()->json();

        $this->assertSame('central', $json['referencias']['origen']);
        $this->assertContains('DIGITAL-CHISPERIO', array_column($json['referencias']['cuentas'], 'codigo'));
        $this->assertEquals(2000.0, $json["resumen"]["total"]);
        $this->assertSame('Chispa', $json['resumen']['items'][0]['titulo']);
        $this->assertSame($usuario->id, $json['vendedor_por_defecto']);
        $this->assertTrue($json['vendedores'][0]['mapeado']);
        $this->assertTrue($json['vendedores'][0]['habilitado_en_central']);
        $this->assertFalse($json['puede_elegir_vendedor']);

        // Un admin sí elige, y ve a los usuarios con vendedor asignado.
        $admin = $this->vendedor();
        $jsonAdmin = $this->actingAs($admin)->getJson(route('pedidos.confirmacion', $pedido))->assertOk()->json();
        $this->assertTrue($jsonAdmin['puede_elegir_vendedor']);
        $this->assertContains($usuario->id, array_column($jsonAdmin['vendedores'], 'id'));
    }

    public function test_si_el_central_no_responde_el_modal_usa_la_lista_de_respaldo_configurable(): void
    {
        $pedido = $this->comprar();
        $this->central->caido = true;
        config(['integracion.referencias_respaldo' => ['cuentas' => [['codigo' => 'EFECTIVO', 'nombre' => 'Efectivo']], 'formas_envio' => [['id' => 1, 'nombre' => 'A domicilio', 'es_retiro' => false]]]]);

        $json = $this->actingAs($this->vendedor())->getJson(route('pedidos.confirmacion', $pedido))->assertOk()->json();

        $this->assertSame('respaldo', $json['referencias']['origen']);
        $this->assertSame(['EFECTIVO'], array_column($json['referencias']['cuentas'], 'codigo'));
        $this->assertNotNull($json['referencias']['error']);
    }
}
