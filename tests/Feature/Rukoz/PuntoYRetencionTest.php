<?php

namespace Tests\Feature\Rukoz;

use App\Enums\EstadoPedido;
use App\Enums\RolUsuario;
use App\Enums\Sucursal;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Rukoz\EspejoStock;
use App\Rukoz\EstadoDesdeCentral;
use App\Rukoz\PuntoDeAtencion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Rukoz\CoreClient\Eventos\PedidoActualizado;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Rukoz\CoreClient\Inbox\RegistroDeInbox;
use Rukoz\CoreClient\Procesamiento\ProcesadorEventos;
use Tests\Support\CentralDePrueba;
use Tests\Support\ContratoConfirmacionCentral;
use Tests\Support\ContratoPedidoCentral;
use Tests\TestCase;

/**
 * 11.4b — Punto de atención por pedido (`punto`) y retención del despacho (`solo_con_pago_completo` / `retenido_por_pago`).
 *
 * Todo contra el Central falso con el cliente REAL del paquete (0.1.2); cada body de `reservar`, `editarReserva` y `confirmar`
 * se valida contra el contrato (`ContratoPedidoCentral`, `ContratoConfirmacionCentral`, claves del fixture oficial con `punto`
 * y `solo_con_pago_completo`) y el Central falso responde `PUNTO_DESCONOCIDO` si el código no está en `GET /referencias`.
 */
class PuntoYRetencionTest extends TestCase
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
        $this->assertSame([], $this->central->erroresDeContrato, 'La web mandó un body que el Central rechazaría');

        parent::tearDown();
    }

    private function vendedor(array $extra = []): User
    {
        return User::factory()->create(['rukoz_vendedor_id' => '7', ...$extra]);
    }

    /** Un pedido por el checkout real. `$extra` trae `cliente_provincia` y/o `sucursal`, como los manda la tienda. */
    private function comprar(array $extra = []): Pedido
    {
        $producto = Producto::factory()->create(['titulo' => 'Chispa', 'precio' => 1000, 'stock' => 50]);
        $respuesta = $this->postJson('/checkout', ['cliente_nombre' => 'PRUEBA 11.4b', 'cliente_telefono' => '1155550000', 'items' => [['producto_id' => $producto->id, 'cantidad' => 2]], ...$extra]);
        $respuesta->assertCreated();

        return Pedido::findOrFail($respuesta->json('id'));
    }

    private function confirmar(Pedido $pedido, array $datos = [], ?User $usuario = null)
    {
        return $this->actingAs($usuario ?? $this->vendedor())->post(route('pedidos.confirmar', $pedido), [
            'pagos' => [],
            'envio' => ['forma_envio_id' => 1, 'costo_cobrado' => 0, 'es_gratis' => false, 'transportista_id' => 1],
            ...$datos,
        ]);
    }

    private function editar(Pedido $pedido, array $extra, ?User $usuario = null)
    {
        $items = $pedido->items->map(fn ($i) => ['id' => $i->id, 'cantidad' => $i->cantidad, 'precio_unitario' => (float) $i->precio_unitario])->all();

        return $this->actingAs($usuario ?? User::factory()->create())->put(route('pedidos.update', $pedido), [
            'cliente_nombre' => $pedido->cliente_nombre, 'cliente_telefono' => $pedido->cliente_telefono, 'cliente_provincia' => $pedido->cliente_provincia, 'items' => $items, ...$extra,
        ]);
    }

    private function referencias(): array
    {
        return json_decode((string) file_get_contents(base_path('tests/fixtures/rukoz/response-referencias.json')), true);
    }

    private function ultimo(string $metodo, string $patron): array
    {
        $llamadas = $this->central->llamadasA($metodo, $patron);
        $this->assertNotEmpty($llamadas, "No hubo ningún {$metodo} {$patron}");

        return end($llamadas)[2];
    }

    private function entregar(string $evento, array $datos): void
    {
        $sobre = ['id' => (string) Str::uuid(), 'evento' => $evento, 'secuencia' => ++$this->secuencia, 'creado_at' => now()->toIso8601String(), 'integracion' => 'chisperio', 'datos' => $datos];

        [$fila] = app(RegistroDeInbox::class)->guardar($sobre, json_encode($sobre), 'webhook');
        app(ProcesadorEventos::class)->procesar([$fila]);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // reservar: el punto sale de la regla provincia → sucursal
    // ------------------------------------------------------------------------------------------------------------------

    public function test_un_pedido_de_cordoba_reserva_con_el_punto_cba_y_sin_la_sucursal_en_las_observaciones(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba', 'observaciones' => 'Tocar timbre']);

        $payload = $this->ultimo('POST', '#^/pedidos$#');
        $this->assertSame('CBA', $payload['punto']);
        $this->assertSame('Tocar timbre', $payload['cliente']['observaciones']);
        $this->assertSame([], ContratoPedidoCentral::errores($payload));
        $this->assertSame([], ContratoPedidoCentral::errorDePunto($payload, $this->referencias()));

        $this->assertSame(Sucursal::Cordoba, $pedido->sucursal);
        $this->assertSame('CBA', $pedido->rukoz_punto, 'El punto que informó el Central queda guardado');
    }

    public function test_un_pedido_de_buenos_aires_reserva_con_el_punto_ba(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Buenos Aires', 'sucursal' => 'buenos-aires']);

        $this->assertSame('BA', $this->ultimo('POST', '#^/pedidos$#')['punto']);
        $this->assertSame('BA', $pedido->rukoz_punto);
    }

    public function test_otra_provincia_va_al_punto_de_buenos_aires_como_siempre(): void
    {
        $this->comprar(['cliente_provincia' => 'Santa Fe', 'sucursal' => 'buenos-aires']);

        $this->assertSame('BA', $this->ultimo('POST', '#^/pedidos$#')['punto']);
    }

    public function test_si_el_checkout_no_manda_la_sucursal_se_usa_la_regla_de_la_provincia(): void
    {
        $this->comprar(['cliente_provincia' => 'Mendoza']);

        $this->assertSame('CBA', $this->ultimo('POST', '#^/pedidos$#')['punto']);
    }

    public function test_la_sucursal_que_elige_el_cliente_gana_sobre_la_sugerida_por_la_provincia(): void
    {
        // Vive en Córdoba pero eligió coordinar con Buenos Aires: el selector del checkout manda.
        $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'buenos-aires']);

        $this->assertSame('BA', $this->ultimo('POST', '#^/pedidos$#')['punto']);
    }

    public function test_el_envio_gratis_sigue_en_las_observaciones(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);
        $pedido->forceFill(['envio_gratis' => true])->save();

        $armado = app(\App\Rukoz\PedidoParaCentral::class)->armar($pedido->fresh(), $pedido->items, $pedido->created_at)->payload;

        $this->assertSame('Envío gratis', $armado['cliente']['observaciones']);
        $this->assertSame('CBA', $armado['punto']);
    }

    public function test_una_sucursal_sin_codigo_configurado_no_manda_punto_y_rige_el_predeterminado(): void
    {
        config(['integracion.puntos.cordoba' => '']);

        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->assertArrayNotHasKey('punto', $this->ultimo('POST', '#^/pedidos$#'));
        $this->assertSame('BA', $pedido->rukoz_punto, 'El Central usó su predeterminado y lo informó');
    }

    public function test_un_codigo_que_el_central_no_tiene_no_crea_el_pedido(): void
    {
        config(['integracion.puntos.cordoba' => 'NQN']);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 5]);

        $this->postJson('/checkout', ['cliente_nombre' => 'PRUEBA 11.4b', 'cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba', 'items' => [['producto_id' => $producto->id, 'cantidad' => 1]]])
            ->assertStatus(422);

        $this->assertSame(0, Pedido::count());
    }

    // ------------------------------------------------------------------------------------------------------------------
    // editarReserva: cambiar la provincia cambia el punto
    // ------------------------------------------------------------------------------------------------------------------

    public function test_editar_la_provincia_a_una_de_otra_sucursal_manda_el_punto_nuevo(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Buenos Aires', 'sucursal' => 'buenos-aires']);
        $this->assertSame('BA', $pedido->rukoz_punto);

        $this->editar($pedido, ['cliente_provincia' => 'Córdoba'])->assertSessionHasNoErrors();

        $put = $this->ultimo('PUT', '#^/pedidos/#');
        $this->assertSame('CBA', $put['punto']);
        $this->assertSame([], ContratoPedidoCentral::errores($put));

        $pedido->refresh();
        $this->assertSame(Sucursal::Cordoba, $pedido->sucursal);
        $this->assertSame('CBA', $pedido->rukoz_punto);
        $this->assertSame(2, $pedido->rukoz_version);

        // Y de vuelta.
        $this->editar($pedido, ['cliente_provincia' => 'Neuquén'])->assertSessionHasNoErrors();
        $this->assertSame('BA', $this->ultimo('PUT', '#^/pedidos/#')['punto']);
        $this->assertSame('BA', $pedido->fresh()->rukoz_punto);
    }

    public function test_editar_sin_cambiar_la_provincia_conserva_la_sucursal_que_eligio_el_cliente(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'buenos-aires']);

        $this->editar($pedido, ['observaciones' => 'Entregar por la tarde'])->assertSessionHasNoErrors();

        $this->assertSame('BA', $this->ultimo('PUT', '#^/pedidos/#')['punto']);
        $this->assertSame(Sucursal::BuenosAires, $pedido->fresh()->sucursal);
    }

    public function test_cambiar_de_provincia_dentro_de_la_misma_sucursal_no_cambia_el_punto(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->editar($pedido, ['cliente_provincia' => 'Tucumán'])->assertSessionHasNoErrors();

        $this->assertSame('CBA', $this->ultimo('PUT', '#^/pedidos/#')['punto']);
        $this->assertSame(Sucursal::Cordoba, $pedido->fresh()->sucursal);
    }

    public function test_un_vendedor_que_pasa_el_pedido_a_la_otra_sucursal_vuelve_al_listado(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Buenos Aires', 'sucursal' => 'buenos-aires']);
        $vendedor = User::factory()->create(['role' => RolUsuario::Vendedor, 'sucursal' => Sucursal::BuenosAires]);

        $this->editar($pedido, ['cliente_provincia' => 'Salta'], $vendedor)
            ->assertRedirect(route('pedidos.index'))
            ->assertSessionHas('success');

        $this->assertSame(Sucursal::Cordoba, $pedido->fresh()->sucursal);
        $this->assertSame('CBA', $this->ultimo('PUT', '#^/pedidos/#')['punto']);
    }

    public function test_si_el_central_rechaza_el_punto_en_la_edicion_no_se_guarda_nada(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Buenos Aires', 'sucursal' => 'buenos-aires']);
        config(['integracion.puntos.cordoba' => 'NQN']);

        $this->editar($pedido, ['cliente_provincia' => 'Córdoba'])->assertSessionHasErrors('estado');

        $pedido->refresh();
        $this->assertSame('Buenos Aires', $pedido->cliente_provincia);
        $this->assertSame(Sucursal::BuenosAires, $pedido->sucursal);
        $this->assertSame('BA', $pedido->rukoz_punto);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // confirmar: punto y solo_con_pago_completo
    // ------------------------------------------------------------------------------------------------------------------

    public function test_el_modal_trae_el_punto_del_pedido_y_la_lista_de_puntos_del_central(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->actingAs($this->vendedor())->getJson(route('pedidos.confirmacion', $pedido))
            ->assertOk()
            ->assertJsonPath('punto', 'CBA')
            ->assertJsonPath('referencias.puntos.0.codigo', 'BA')
            ->assertJsonPath('referencias.puntos.1.codigo', 'CBA');
    }

    public function test_confirmar_manda_el_punto_del_pedido_y_la_retencion_si_queda_saldo(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->confirmar($pedido, ['punto' => 'CBA', 'solo_con_pago_completo' => true])->assertSessionHasNoErrors();

        $body = $this->ultimo('POST', '#^/pedidos/[^/]+/confirmar$#');
        $this->assertSame('CBA', $body['punto']);
        $this->assertTrue($body['solo_con_pago_completo']);
        $this->assertSame([], ContratoConfirmacionCentral::errores($body, $this->referencias(), 2000.0));

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Confirmado, $pedido->estado);
        $this->assertSame('CBA', $pedido->rukoz_punto);
        $this->assertTrue($pedido->rukoz_retenido_por_pago, 'La respuesta del Central trae retenido_por_pago');
        $this->assertSame(2000.0, (float) $pedido->rukoz_saldo);
    }

    public function test_sin_tocar_nada_confirma_con_el_punto_del_pedido_y_sin_retencion(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->confirmar($pedido)->assertSessionHasNoErrors();

        $body = $this->ultimo('POST', '#^/pedidos/[^/]+/confirmar$#');
        $this->assertSame('CBA', $body['punto'], 'Sin que el vendedor lo toque, va el punto del pedido');
        $this->assertFalse($body['solo_con_pago_completo']);
        $this->assertFalse($pedido->fresh()->rukoz_retenido_por_pago);
    }

    public function test_el_vendedor_puede_corregir_el_punto_al_confirmar(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->confirmar($pedido, ['punto' => 'BA'])->assertSessionHasNoErrors();

        $this->assertSame('BA', $this->ultimo('POST', '#^/pedidos/[^/]+/confirmar$#')['punto']);
        $this->assertSame('BA', $pedido->fresh()->rukoz_punto);
    }

    public function test_un_punto_que_no_esta_en_las_referencias_se_rechaza_antes_de_llamar_al_central(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);

        $this->confirmar($pedido, ['punto' => 'NQN'])->assertSessionHasErrors('punto');

        $this->assertSame([], $this->central->llamadasA('POST', '#^/pedidos/[^/]+/confirmar$#'));
        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
    }

    public function test_la_casilla_con_pago_completo_no_retiene_aunque_llegue_marcada(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Buenos Aires', 'sucursal' => 'buenos-aires']);

        // 2 × 1000 sin envío = 2000: el pago cubre todo, no hay saldo que esperar.
        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'DIGITAL-CHISPERIO', 'medio' => 'transferencia', 'monto' => 2000]], 'solo_con_pago_completo' => true])
            ->assertSessionHasNoErrors();

        $body = $this->ultimo('POST', '#^/pedidos/[^/]+/confirmar$#');
        $this->assertFalse($body['solo_con_pago_completo']);
        $this->assertFalse($pedido->fresh()->rukoz_retenido_por_pago);
    }

    public function test_la_casilla_con_pago_parcial_retiene(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Buenos Aires', 'sucursal' => 'buenos-aires']);

        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'DIGITAL-CHISPERIO', 'medio' => 'transferencia', 'monto' => 500]], 'solo_con_pago_completo' => true])
            ->assertSessionHasNoErrors();

        $this->assertTrue($this->ultimo('POST', '#^/pedidos/[^/]+/confirmar$#')['solo_con_pago_completo']);
        $this->assertTrue($pedido->fresh()->rukoz_retenido_por_pago);
    }

    public function test_un_codigo_de_punto_que_el_central_rechaza_al_confirmar_no_cambia_el_pedido(): void
    {
        // Reserva anterior a la 11.4b (sin punto guardado) y un código mal configurado: lo decide el Central y la web lo explica.
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);
        $pedido->forceFill(['rukoz_punto' => null])->save();
        config(['integracion.puntos.cordoba' => 'NQN']);

        $mensaje = $this->confirmar($pedido)->assertSessionHasErrors('confirmacion')->baseResponse->getSession()->get('errors')->first('confirmacion');
        $this->assertStringContainsString('«NQN»', $mensaje);
        $this->assertStringContainsString('BA, CBA', $mensaje);

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Pendiente, $pedido->estado);
        $this->assertNull($pedido->confirmado_at);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // El evento con retenido_por_pago
    // ------------------------------------------------------------------------------------------------------------------

    public function test_el_evento_con_retenido_por_pago_se_ve_en_la_ficha_y_se_libera_al_completar_el_pago(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);
        $this->confirmar($pedido, ['pagos' => [['cuenta' => 'DIGITAL-CHISPERIO', 'medio' => 'transferencia', 'monto' => 500]], 'solo_con_pago_completo' => true])->assertSessionHasNoErrors();
        $ref = $pedido->rukoz_ref;
        $admin = User::factory()->create();

        // Confirmado y retenido: la ficha lo dice.
        $this->actingAs($admin)->get(route('pedidos.show', $pedido))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('pedido.rukoz_retenido_por_pago', true)
            ->where('pedido.rukoz_punto', 'CBA'));

        // El empaquetado llega con la retención todavía puesta.
        $this->entregar('pedido.empaquetado', $this->central->avanzar($ref, 'empaquetado', ['empaquetado_at' => now()->toIso8601String()]));
        $pedido->refresh();
        $this->assertSame(EstadoPedido::Empaquetado, $pedido->estado);
        $this->assertTrue($pedido->rukoz_retenido_por_pago);

        // Se carga el pago completo en el Central: la venta se libera sola y llega pedido.pago_actualizado.
        $datos = $this->central->completarPago($ref);
        $this->assertFalse($datos['retenido_por_pago']);
        $this->entregar('pedido.pago_actualizado', $datos);

        $pedido->refresh();
        $this->assertFalse($pedido->rukoz_retenido_por_pago);
        $this->assertSame(0.0, (float) $pedido->rukoz_saldo);
        $this->assertSame('CBA', $pedido->rukoz_punto);

        $this->actingAs($admin)->get(route('pedidos.show', $pedido))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('pedido.rukoz_retenido_por_pago', false));
    }

    public function test_un_evento_viejo_sin_punto_ni_retencion_no_borra_lo_ya_sabido(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);
        $this->confirmar($pedido, ['solo_con_pago_completo' => true])->assertSessionHasNoErrors();
        $ref = $pedido->rukoz_ref;

        $datos = $this->central->avanzar($ref, 'empaquetado', ['empaquetado_at' => now()->toIso8601String()]);
        unset($datos['punto'], $datos['retenido_por_pago']);
        $this->entregar('pedido.empaquetado', $datos);

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Empaquetado, $pedido->estado);
        $this->assertSame('CBA', $pedido->rukoz_punto);
        $this->assertTrue($pedido->rukoz_retenido_por_pago);
    }

    public function test_un_pedido_viejo_con_rukoz_ref_y_sin_punto_guardado_se_confirma_con_el_de_su_sucursal(): void
    {
        $pedido = $this->comprar(['cliente_provincia' => 'Córdoba', 'sucursal' => 'cordoba']);
        // Reserva anterior a la 11.4b: el Central le puso su predeterminado y la web no guardó ninguno.
        $pedido->forceFill(['rukoz_punto' => null])->save();

        $this->assertSame('CBA', PuntoDeAtencion::codigoDe($pedido->sucursal));
        $this->actingAs($this->vendedor())->getJson(route('pedidos.confirmacion', $pedido))->assertJsonPath('punto', 'CBA');

        $this->confirmar($pedido)->assertSessionHasNoErrors();
        $this->assertSame('CBA', $this->ultimo('POST', '#^/pedidos/[^/]+/confirmar$#')['punto']);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // chisperio:integracion-estado
    // ------------------------------------------------------------------------------------------------------------------

    public function test_integracion_estado_aprueba_los_codigos_que_existen_en_el_central(): void
    {
        $codigo = Artisan::call('chisperio:integracion-estado');
        $salida = preg_replace('/\s+/', ' ', Artisan::output());

        $this->assertSame(0, $codigo, $salida);
        $this->assertStringContainsString('Buenos Aires → BA, Córdoba → CBA', $salida);
        $this->assertStringContainsString('todos existen en el Central', $salida);
    }

    public function test_integracion_estado_marca_como_error_un_codigo_que_el_central_no_tiene(): void
    {
        config(['integracion.puntos.cordoba' => 'NQN']);

        $codigo = Artisan::call('chisperio:integracion-estado');
        $salida = preg_replace('/\s+/', ' ', Artisan::output());

        $this->assertSame(1, $codigo);
        $this->assertStringContainsString('ERROR', $salida);
        $this->assertStringContainsString('«NQN» no existe en el Central', $salida);
    }
}
