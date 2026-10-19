<?php

namespace Tests\Feature\Rukoz;

use App\Enums\TipoDescuento;
use App\Models\Addon;
use App\Models\CodigoDescuento;
use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Rukoz\CoreClient\Circuito\Circuito;
use App\Rukoz\EspejoStock;
use Rukoz\CoreClient\Compensaciones\Compensacion;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Rukoz\CoreClient\Stock\StockItem;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/**
 * 11.3 — El checkout reserva en el Central antes de guardar el pedido. Habla con el cliente REAL del paquete (idempotencia,
 * circuito, compensaciones) contra un Central falso con estado que valida cada body con el contrato (tests/Support).
 */
class CheckoutConReservaTest extends TestCase
{
    use RefreshDatabase;

    private CentralDePrueba $central;

    protected function setUp(): void
    {
        parent::setUp();

        $this->central = CentralDePrueba::instalar();

        // En producción lo registra AppServiceProvider al arrancar con INTEGRACION_STOCK; acá la config se enciende después del arranque.
        Event::listen(StockActualizado::class, [EspejoStock::class, 'alActualizarse']);
    }

    protected function tearDown(): void
    {
        // Nada de lo que la web mandó puede violar el contrato del Central.
        $this->assertSame([], $this->central->erroresDeContrato, 'La web mandó un body que el Central rechazaría');

        parent::tearDown();
    }

    private function checkout(array $items = [], array $combos = [], array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/checkout', array_merge([
            'cliente_nombre' => 'Cliente de prueba',
            'cliente_telefono' => '1155550000',
            'items' => $items,
            'combos' => $combos,
        ], $extra));
    }

    private function variante(Producto $producto, string $nombre, float $recargo = 0, ?int $stock = null, bool $personalizada = false): ProductoVariante
    {
        return ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => $nombre,
            'color_hex' => '#123456',
            'es_color_personalizado' => $personalizada,
            'precio_adicional' => $recargo,
            'stock' => $stock,
            'is_active' => true,
        ]);
    }

    /** El único pedido que recibió el Central, tal cual lo mandó la web. */
    private function reservaUnica(): array
    {
        $this->assertCount(1, $this->central->pedidos, 'Tendría que haber una sola reserva en el Central');

        return array_values($this->central->pedidos)[0]['payload'];
    }

    private function combosDeEjemplo(): array
    {
        // Combo fijo: dos productos sin variantes.
        $a = Producto::factory()->create(['titulo' => 'Chispa A', 'precio' => 100, 'stock' => 50]);
        $b = Producto::factory()->create(['titulo' => 'Chispa B', 'precio' => 100, 'stock' => 50]);
        $fijo = Combo::create(['titulo' => 'Combo fijo', 'precio' => 1500, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $fijo->id, 'producto_id' => $a->id, 'cantidad' => 2, 'orden' => 0]);
        ComboProducto::create(['combo_id' => $fijo->id, 'producto_id' => $b->id, 'cantidad' => 1, 'orden' => 1]);

        // Combo mixto: una pistola con color a elegir + chispas fijas (como el combo «asd» real).
        $pistola = Producto::factory()->create(['titulo' => 'Pistola', 'precio' => 5000]);
        $roja = $this->variante($pistola, 'Roja', 0, 5);
        $azul = $this->variante($pistola, 'Azul', 0, 5);
        $mixto = Combo::create(['titulo' => 'Combo mixto', 'precio' => 8000, 'is_active' => true]);
        $lineaPistola = ComboProducto::create(['combo_id' => $mixto->id, 'producto_id' => $pistola->id, 'cantidad' => 1, 'orden' => 0]);
        $lineaChispas = ComboProducto::create(['combo_id' => $mixto->id, 'producto_id' => $a->id, 'cantidad' => 2, 'orden' => 1]);

        return compact('a', 'b', 'fijo', 'pistola', 'roja', 'azul', 'mixto', 'lineaPistola', 'lineaChispas');
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Qué se reserva y qué se guarda
    // ------------------------------------------------------------------------------------------------------------------

    public function test_producto_simple_reserva_en_el_central_y_no_descuenta_stock_local(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Chispa simple', 'precio' => 1000, 'stock' => 10]);

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 3]], [], [
            'cliente_dni' => '30123456', 'cliente_provincia' => 'Córdoba', 'cliente_ciudad' => 'Córdoba', 'cliente_codigo_postal' => '5000',
            'observaciones' => 'Tocar timbre', 'sucursal' => 'cordoba',
        ]);

        $respuesta->assertCreated();
        $pedido = Pedido::findOrFail($respuesta->json('id'));

        $this->assertNotNull($pedido->rukoz_ref);
        $this->assertStringStartsWith('CHP-', $pedido->rukoz_ref);
        $this->assertSame('reservado', $pedido->rukoz_estado);
        $this->assertSame(1, $pedido->rukoz_version);
        $this->assertTrue($pedido->usaCentral());
        $this->assertTrue($pedido->tieneReservaAbierta());

        // La web no toca su stock: lo reservó el Central.
        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());

        $payload = $this->reservaUnica();
        $this->assertSame($pedido->rukoz_ref, $payload['external_ref']);
        $this->assertEquals([[
            'tipo' => 'producto', 'id' => (string) $producto->id, 'nombre' => 'Chispa simple', 'cantidad' => 3, 'precio_unitario' => 1000.0,
        ]], $payload['items']);
        $this->assertEquals(3000.0, $payload['total']);
        $this->assertSame('ARS', $payload['moneda']);
        $this->assertSame([
            'nombre' => 'Cliente de prueba', 'telefono' => '1155550000', 'dni' => '30123456', 'localidad' => 'Córdoba',
            'provincia' => 'Córdoba', 'cp' => '5000', 'observaciones' => 'Tocar timbre',
        ], $payload['cliente']);
        // 11.4b — La sucursal ya no va en las observaciones: viaja en su campo, `punto`.
        $this->assertSame('CBA', $payload['punto']);
        $this->assertSame('CBA', $pedido->rukoz_punto);
        // El `creado_at` que recibió el Central es la hora del pedido guardado (así un PUT posterior manda la misma).
        $this->assertSame($payload['creado_at'], $pedido->created_at->toIso8601String());
    }

    public function test_producto_con_variantes_va_como_variante_con_el_precio_final_por_unidad(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $roja = $this->variante($producto, 'Roja', 100, 5);
        $this->variante($producto, 'Azul', 0, 5);

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $roja->id]])->assertCreated();

        $payload = $this->reservaUnica();
        $this->assertEquals([[
            'tipo' => 'variante', 'id' => (string) $roja->id, 'nombre' => 'Bengala (Roja)', 'cantidad' => 2, 'precio_unitario' => 600.0,
        ]], $payload['items']);
        // Un producto «con variantes» (no_aplica en el Central) jamás viaja como línea `producto`.
        $this->assertEquals(1200.0, $payload['total']);
        $this->assertSame(5, $roja->fresh()->stock);
    }

    public function test_combo_fijo_viaja_como_combo_sin_selecciones(): void
    {
        ['fijo' => $fijo] = $this->combosDeEjemplo();

        $this->checkout([], [['combo_id' => $fijo->id, 'cantidad' => 2]])->assertCreated();

        $payload = $this->reservaUnica();
        $this->assertEquals([[
            'tipo' => 'combo', 'id' => (string) $fijo->id, 'nombre' => 'Combo fijo', 'cantidad' => 2, 'precio_unitario' => 1500.0,
        ]], $payload['items']);
        $this->assertEquals(3000.0, $payload['total']);
    }

    public function test_combo_mixto_viaja_con_un_grupo_por_linea_y_el_nombre_del_catalogo(): void
    {
        ['mixto' => $mixto, 'lineaPistola' => $lineaPistola, 'lineaChispas' => $lineaChispas, 'azul' => $azul, 'a' => $a] = $this->combosDeEjemplo();

        $this->checkout([], [[
            'combo_id' => $mixto->id, 'cantidad' => 2,
            'selecciones' => [['combo_producto_id' => $lineaPistola->id, 'variante_id' => $azul->id]],
        ]])->assertCreated();

        $payload = $this->reservaUnica();

        $this->assertEquals([[
            'tipo' => 'combo', 'id' => (string) $mixto->id, 'nombre' => 'Combo mixto', 'cantidad' => 2, 'precio_unitario' => 8000.0,
            'selecciones' => [
                ['grupo' => "Pistola (#{$lineaPistola->id})", 'opciones' => [['tipo' => 'variante', 'id' => (string) $azul->id, 'cantidad' => 1]]],
                ['grupo' => "Chispa A (#{$lineaChispas->id})", 'opciones' => [['tipo' => 'producto', 'id' => (string) $a->id, 'cantidad' => 2]]],
            ],
        ]], $payload['items']);
        $this->assertEquals(16000.0, $payload['total']);
    }

    public function test_color_a_eleccion_y_add_on_con_texto_viajan_en_la_nota_de_la_linea(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $elegir = $this->variante($producto, 'A elección', 0, null, personalizada: true);
        $grabado = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'requiere_texto' => true, 'max_caracteres' => 30, 'is_active' => true]);
        $nombre = Addon::create(['nombre' => 'Nombre', 'precio' => 100, 'requiere_texto' => true, 'max_caracteres' => 30, 'is_active' => true]);
        $producto->addons()->attach([$grabado->id => ['orden' => 0], $nombre->id => ['orden' => 1]]);

        $this->checkout([[
            'producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $elegir->id,
            'color_personalizado_texto' => 'Turquesa',
            'addons' => [
                ['addon_id' => $grabado->id, 'texto_personalizado' => 'Para Ana'],
                ['addon_id' => $nombre->id, 'texto_personalizado' => 'Lucía'],
            ],
        ]])->assertCreated();

        $linea = $this->reservaUnica()['items'][0];

        $this->assertSame('Color: Turquesa · Grabado: Para Ana · Nombre: Lucía', $linea['nota']);
        $this->assertEquals(900.0, $linea['precio_unitario']); // 500 + 300 + 100: el add-on es parte del precio por unidad
    }

    public function test_la_nota_se_recorta_a_500_caracteres_y_no_viaja_vacia(): void
    {
        $producto = Producto::factory()->create(['precio' => 500]);
        $elegir = $this->variante($producto, 'A elección', 0, null, personalizada: true);
        $sinTexto = Producto::factory()->create(['precio' => 500]);

        $this->checkout([
            ['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $elegir->id, 'color_personalizado_texto' => str_repeat('x', 255)],
            ['producto_id' => $sinTexto->id, 'cantidad' => 1],
        ])->assertCreated();

        [$conNota, $sinNota] = $this->reservaUnica()['items'];

        $this->assertSame('Color: '.str_repeat('x', 255), $conNota['nota']);
        $this->assertArrayNotHasKey('nota', $sinNota);
    }

    public function test_cupon_no_se_reparte_entre_las_lineas_total_es_la_suma_menos_el_descuento(): void
    {
        $a = Producto::factory()->create(['titulo' => 'A', 'precio' => 1000]);
        $b = Producto::factory()->create(['titulo' => 'B', 'precio' => 3000]);
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'tipo_descuento' => TipoDescuento::Porcentaje, 'valor_descuento' => 10, 'limite_usos' => 5]);

        $respuesta = $this->checkout(
            [['producto_id' => $a->id, 'cantidad' => 1], ['producto_id' => $b->id, 'cantidad' => 1]],
            [],
            ['codigo_descuento' => 'DIEZ']
        );

        $respuesta->assertCreated();
        $payload = $this->reservaUnica();

        // Las líneas conservan su precio final sin cupón; el Central toma (4000 − 3600) como descuento al confirmar.
        $this->assertEquals([1000.0, 3000.0], array_column($payload['items'], 'precio_unitario'));
        $this->assertEquals(3600.0, $payload['total']);

        $pedido = Pedido::findOrFail($respuesta->json('id'));
        $this->assertEquals(4000.0, (float) $pedido->subtotal);
        $this->assertEquals(400.0, (float) $pedido->descuento_monto);
        $this->assertNotNull($pedido->codigo_descuento_consumido_at);
        $this->assertSame(1, $cupon->fresh()->usos_actuales);
    }

    public function test_con_recargo_de_tarjeta_viaja_total_con_recargo(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $plan = \App\Models\PlanPagoTarjeta::create(['nombre' => '3 cuotas', 'cuotas' => 3, 'recargo_porcentaje' => 10, 'is_active' => true]);

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]], [], ['plan_pago_tarjeta_id' => $plan->id])->assertCreated();

        $payload = $this->reservaUnica();
        $this->assertEquals(1000.0, $payload['total']);
        $this->assertEquals(1100.0, $payload['total_con_recargo']);
    }

    public function test_envio_gratis_se_avisa_en_las_observaciones_y_no_suma_al_total(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        \App\Models\ConfiguracionEnvio::obtener()->update(['monto_minimo' => 500]);

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]])->assertCreated();

        $payload = $this->reservaUnica();
        $this->assertSame('Envío gratis', $payload['cliente']['observaciones']);
        $this->assertEquals(1000.0, $payload['total']);
    }

    public function test_los_datos_del_cliente_se_recortan_a_los_topes_del_central(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]], [], [
            'cliente_dni' => str_repeat('1', 50), 'cliente_telefono' => str_repeat('2', 50), 'cliente_codigo_postal' => str_repeat('3', 20),
        ])->assertCreated();

        $cliente = $this->reservaUnica()['cliente'];
        $this->assertSame(30, strlen($cliente['dni']));
        $this->assertSame(10, strlen($cliente['cp']));
    }

    // ------------------------------------------------------------------------------------------------------------------
    // El Central rechaza o no responde
    // ------------------------------------------------------------------------------------------------------------------

    public function test_sin_stock_en_el_central_rechaza_con_producto_y_color_y_refresca_el_espejo(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $roja = $this->variante($producto, 'Roja', 0, 10); // el espejo cree que hay 10
        $this->central->disponible['variante:'.$roja->id] = 2;
        $this->central->stock['variante:'.$roja->id] = ['disponible' => 2];
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'limite_usos' => 5]);

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 4, 'variante_id' => $roja->id]], [], ['codigo_descuento' => 'DIEZ']);

        $respuesta->assertStatus(422);
        $this->assertSame(
            ["Solo quedan 2 unidades de Bengala (Roja) (pediste 4). Ajustá la cantidad."],
            $respuesta->json('errors')["stock.{$producto->id}"]
        );

        // No se creó nada: ni pedido, ni reserva, ni cupón consumido.
        $this->assertSame(0, Pedido::count());
        $this->assertSame([], $this->central->vivos());
        $this->assertSame(0, $cupon->fresh()->usos_actuales);

        // El espejo se actualizó con lo que dijo el Central (2), así la tienda ya no ofrece 10.
        $this->assertSame(2, $roja->fresh()->stock);
        $this->assertSame(2, StockItem::where('tipo', 'variante')->where('external_id', (string) $roja->id)->value('disponible'));
    }

    public function test_el_rechazo_corrige_la_columna_aunque_el_cache_del_espejo_ya_estuviera_al_dia(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $roja = $this->variante($producto, 'Roja', 0, 9); // la columna quedó atrasada (9)…
        StockItem::query()->create(['tipo' => 'variante', 'external_id' => (string) $roja->id, 'disponible' => 1, 'vinculado' => true, 'version' => 5]); // …pero rukoz_stock ya dice 1
        $this->central->disponible['variante:'.$roja->id] = 1;
        $this->central->stock['variante:'.$roja->id] = ['disponible' => 1];

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 3, 'variante_id' => $roja->id]])->assertStatus(422);

        $this->assertSame(1, $roja->fresh()->stock);
    }

    public function test_sin_stock_total_dice_no_queda_stock_de_producto_y_color(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $azul = $this->variante($producto, 'Azul', 0, 10);
        $this->central->disponible['variante:'.$azul->id] = 0;

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $azul->id]]);

        $respuesta->assertStatus(422);
        $this->assertSame(['No queda stock de Bengala (Azul).'], $respuesta->json('errors')["stock.{$producto->id}"]);
    }

    public function test_el_rechazo_por_un_combo_nombra_el_combo(): void
    {
        ['fijo' => $fijo, 'a' => $a] = $this->combosDeEjemplo();
        $this->central->disponible['combo:'.$fijo->id] = 0;

        $respuesta = $this->checkout([], [['combo_id' => $fijo->id, 'cantidad' => 1]]);

        $respuesta->assertStatus(422);
        $this->assertSame(['No queda stock del combo "Combo fijo".'], $respuesta->json('errors')["stock.combo.{$fijo->id}"]);
    }

    public function test_central_caido_no_crea_el_pedido_y_responde_el_mensaje_amable(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $this->central->caido = true;

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $respuesta->assertStatus(503)
            ->assertJson([
                'message' => 'No pudimos confirmar el stock en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.',
                'central_no_disponible' => true,
            ]);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(10, $producto->fresh()->stock); // y no vendió con stock local
    }

    public function test_central_caido_el_reintento_reusa_la_referencia_y_no_duplica_la_reserva(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $items = [['producto_id' => $producto->id, 'cantidad' => 1]];

        $this->central->caido = true;
        $this->checkout($items)->assertStatus(503);
        $refDelPrimerIntento = $this->central->llamadas[0][2]['external_ref'];

        // Quedó un «crear dudoso»: el Central pudo haber reservado antes de cortarse.
        $this->assertSame(1, Compensacion::query()->pendientes()->where('tipo', Compensacion::CREAR_DUDOSO)->count());

        $this->central->caido = false;
        $respuesta = $this->checkout($items);

        $respuesta->assertCreated();
        $this->assertSame($refDelPrimerIntento, Pedido::findOrFail($respuesta->json('id'))->rukoz_ref);
        $this->assertCount(1, $this->central->vivos());
        // Al adoptar el pedido, la compensación dudosa ya no tiene sentido (cancelaría una reserva buena).
        $this->assertSame(0, Compensacion::query()->pendientes()->count());
    }

    public function test_circuito_abierto_no_llama_al_central_y_no_vende(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        for ($i = 0; $i < 5; $i++) {
            app(Circuito::class)->falla();
        }

        $this->assertTrue(app(Circuito::class)->abierto());

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]])
            ->assertStatus(503)
            ->assertJson(['central_no_disponible' => true]);

        $this->assertSame([], $this->central->llamadas);
        $this->assertSame(0, Pedido::count());
    }

    public function test_si_se_permite_vender_sin_reserva_el_central_caido_cae_al_flujo_local(): void
    {
        config(['integracion.checkout_sin_reserva' => true]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $this->central->caido = true;

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2]]);

        $respuesta->assertCreated();
        $pedido = Pedido::findOrFail($respuesta->json('id'));
        $this->assertNull($pedido->rukoz_ref);
        $this->assertSame(8, $producto->fresh()->stock); // stock local de siempre
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Doble envío
    // ------------------------------------------------------------------------------------------------------------------

    public function test_doble_envio_identico_crea_un_solo_pedido_y_una_sola_reserva(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $items = [['producto_id' => $producto->id, 'cantidad' => 2]];

        $primero = $this->checkout($items)->assertCreated();
        $segundo = $this->checkout($items)->assertCreated();

        $this->assertSame($primero->json('id'), $segundo->json('id'));
        $this->assertSame(1, Pedido::count());
        $this->assertCount(1, $this->central->vivos());
        $this->assertCount(1, $this->central->llamadasA('POST', '#^/pedidos$#'), 'El segundo envío no tiene que volver a reservar');
    }

    public function test_un_carrito_distinto_es_otro_pedido_con_otra_referencia(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]])->assertCreated();
        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2]])->assertCreated();

        $this->assertSame(2, Pedido::count());
        $this->assertSame(2, Pedido::distinct()->count('rukoz_ref'));
    }

    public function test_repetir_la_compra_pasada_la_ventana_de_doble_envio_es_un_pedido_nuevo(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $items = [['producto_id' => $producto->id, 'cantidad' => 1]];

        $this->checkout($items)->assertCreated();
        $this->travel(5)->minutes();
        $this->checkout($items)->assertCreated();

        $this->assertSame(2, Pedido::count());
    }

    // ------------------------------------------------------------------------------------------------------------------
    // La transacción local falla después de reservar
    // ------------------------------------------------------------------------------------------------------------------

    public function test_si_falla_la_transaccion_local_se_cancela_la_reserva(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Pedido::creating(fn () => throw new RuntimeException('falló la base'));

        $this->withoutExceptionHandling();

        try {
            $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]]);
            $this->fail('Tendría que haber fallado');
        } catch (RuntimeException $e) {
            $this->assertSame('falló la base', $e->getMessage());
        }

        $this->assertSame(0, Pedido::count());
        $this->assertSame([], $this->central->vivos(), 'La reserva se tiene que haber cancelado');
        $this->assertSame('cancelado', array_values($this->central->pedidos)[0]['estado']);
        $this->assertSame(0, Compensacion::query()->pendientes()->count());
    }

    public function test_si_falla_local_y_tambien_la_cancelacion_queda_en_las_compensaciones_y_se_reintenta(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        // Falla la base local Y el Central se cae justo antes de que el paquete intente cancelar.
        Pedido::creating(function () {
            $this->central->caido = true;

            throw new RuntimeException('falló la base');
        });

        $this->withoutExceptionHandling();

        try {
            $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]]);
            $this->fail('Tendría que haber fallado');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame(0, Pedido::count());
        $this->assertCount(1, $this->central->vivos(), 'El Central todavía la tiene reservada');
        $this->assertSame(1, Compensacion::query()->pendientes()->where('tipo', Compensacion::CANCELAR)->count());

        // Vuelve el Central y corre el cron de compensaciones del paquete.
        $this->central->caido = false;
        $this->travel(2)->minutes();
        $this->artisan('rukoz:compensaciones')->assertSuccessful();

        $this->assertSame([], $this->central->vivos());
        $this->assertSame(0, Compensacion::query()->pendientes()->count());
    }

    public function test_si_el_cupon_se_agota_entre_el_calculo_y_el_guardado_se_cancela_la_reserva(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'UNICO', 'limite_usos' => 1]);

        // Otro cliente se lleva el último uso mientras este pedido reservaba.
        $this->central->alCrear = fn () => $cupon->update(['usos_actuales' => 1]);

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]], [], ['codigo_descuento' => 'UNICO']);

        $respuesta->assertStatus(422)->assertJsonValidationErrors('codigo_descuento');
        $this->assertSame(0, Pedido::count());
        $this->assertSame([], $this->central->vivos());
        $this->assertSame(1, $cupon->fresh()->usos_actuales);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Regla de encendido
    // ------------------------------------------------------------------------------------------------------------------

    public function test_checkout_sin_el_espejo_de_stock_no_usa_el_central_y_deja_un_warning(): void
    {
        config(['integracion.stock' => false]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $mensajes = [];
        Event::listen(MessageLogged::class, function (MessageLogged $e) use (&$mensajes) {
            $mensajes[] = [$e->level, $e->message];
        });

        \App\Rukoz\CheckoutCentral::advertir();
        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2]]);

        $respuesta->assertCreated();
        $pedido = Pedido::findOrFail($respuesta->json('id'));
        $this->assertNull($pedido->rukoz_ref);
        $this->assertSame(8, $producto->fresh()->stock);
        $this->assertSame([], $this->central->llamadas);
        $this->assertContains('warning', array_column($mensajes, 0));
        $this->assertStringContainsString('falta INTEGRACION_STOCK', collect($mensajes)->firstWhere(0, 'warning')[1]);
    }

    public function test_con_el_interruptor_apagado_el_checkout_no_toca_el_central(): void
    {
        config(['integracion.checkout' => false]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2]])->assertCreated();

        $this->assertSame([], $this->central->llamadas);
        $this->assertSame(8, $producto->fresh()->stock);
        $this->assertNull(Pedido::first()->rukoz_ref);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Privacidad
    // ------------------------------------------------------------------------------------------------------------------

    public function test_la_nota_y_los_datos_del_cliente_no_se_loguean_aunque_el_central_rechace(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $elegir = $this->variante($producto, 'A elección', 0, null, personalizada: true);
        $this->central->disponible['variante:'.$elegir->id] = 0;

        $logueado = [];
        Event::listen(MessageLogged::class, function (MessageLogged $e) use (&$logueado) {
            $logueado[] = $e->message.' '.json_encode($e->context);
        });

        $this->checkout([[
            'producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $elegir->id, 'color_personalizado_texto' => 'Turquesa secreto',
        ]], [], ['cliente_nombre' => 'Persona Reservada'])->assertStatus(422);

        Log::info('marca para comprobar que el listener escucha');
        $this->assertNotEmpty($logueado);

        foreach ($logueado as $linea) {
            $this->assertStringNotContainsString('Turquesa secreto', $linea);
            $this->assertStringNotContainsString('Persona Reservada', $linea);
        }
    }

    public function test_item_no_vinculado_no_crea_pedido_y_muestra_un_mensaje_general(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        // Un Central que contesta ITEM_NO_VINCULADO (el fixture oficial del contrato) para todo pedido.
        $this->central->errorForzado = [422, json_decode(file_get_contents(base_path('tests/fixtures/rukoz/error-item-no-vinculado.json')), true)];

        $respuesta = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $respuesta->assertStatus(422);
        $this->assertSame(
            ['Uno de los productos no está disponible por el momento. Escribinos por WhatsApp y lo resolvemos.'],
            $respuesta->json('errors.pedido')
        );
        $this->assertSame(0, Pedido::count());
    }
}
