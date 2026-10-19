<?php

namespace Tests\Feature\Rukoz;

use App\Enums\EstadoPedido;
use App\Models\CodigoDescuento;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use App\Rukoz\EspejoStock;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Rukoz\CoreClient\Compensaciones\Compensacion;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Tests\Support\CentralDePrueba;
use Tests\TestCase;

/**
 * 11.3 — Editar y cancelar desde el admin un pedido que tiene su stock reservado en el Central (`rukoz_ref`), y que los
 * pedidos viejos (sin `rukoz_ref`) sigan con el flujo de siempre aunque el interruptor del checkout esté encendido.
 */
class PedidoConReservaAdminTest extends TestCase
{
    use RefreshDatabase;

    private CentralDePrueba $central;

    protected function setUp(): void
    {
        parent::setUp();

        $this->central = CentralDePrueba::instalar();
        Event::listen(StockActualizado::class, [EspejoStock::class, 'alActualizarse']);
    }

    protected function tearDown(): void
    {
        $this->assertSame([], $this->central->erroresDeContrato, 'La web mandó un body que el Central rechazaría');

        parent::tearDown();
    }

    private function comprar(array $items, array $extra = []): Pedido
    {
        $respuesta = $this->postJson('/checkout', ['cliente_nombre' => 'Cliente de prueba', 'cliente_telefono' => '1155550000', 'items' => $items, ...$extra]);
        $respuesta->assertCreated();

        return Pedido::findOrFail($respuesta->json('id'));
    }

    /** Un pedido de la web sola, como los de antes de la integración (stock local). */
    private function comprarSinCentral(array $items): Pedido
    {
        config(['integracion.checkout' => false]);
        $pedido = $this->comprar($items);
        config(['integracion.checkout' => true]);

        return $pedido;
    }

    private function payload(Pedido $pedido, array $itemsOverride = [], array $extra = []): array
    {
        $items = $pedido->items->map(fn ($item, $i) => [
            'id' => $item->id,
            'cantidad' => $item->cantidad,
            'precio_unitario' => (float) $item->precio_unitario,
            'variante_id' => $item->producto_variante_id,
            'color_personalizado_texto' => $item->color_personalizado_texto,
            ...($itemsOverride[$i] ?? []),
        ])->all();

        return ['cliente_nombre' => $pedido->cliente_nombre, 'cliente_telefono' => $pedido->cliente_telefono, 'items' => $items, ...$extra];
    }

    private function editar(Pedido $pedido, array $payload)
    {
        return $this->actingAs(User::factory()->create())->put(route('pedidos.update', $pedido), $payload);
    }

    private function cambiarEstado(Pedido $pedido, string $estado, array $extra = [])
    {
        return $this->actingAs(User::factory()->create())->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => $estado, ...$extra]);
    }

    private function ultimoPut(): array
    {
        $puts = $this->central->llamadasA('PUT', '#^/pedidos/#');
        $this->assertNotEmpty($puts, 'No hubo ningún PUT al Central');

        return end($puts)[2];
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Editar
    // ------------------------------------------------------------------------------------------------------------------

    public function test_editar_una_cantidad_manda_el_pedido_completo_al_central_y_guarda(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Chispa', 'precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $item = $pedido->items->first();

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 5, 'precio_unitario' => 900]]))
            ->assertRedirect(route('pedidos.show', $pedido))
            ->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(5, $item->fresh()->cantidad);
        $this->assertSame(4500.0, (float) $pedido->total);
        $this->assertSame(2, $pedido->rukoz_version);
        $this->assertSame('reservado', $pedido->rukoz_estado);

        // El Central recibió el contenido completo y nuevo, con la misma referencia y la misma hora de creación.
        $put = $this->ultimoPut();
        $this->assertSame($pedido->rukoz_ref, $put['external_ref']);
        $this->assertEquals([['tipo' => 'producto', 'id' => (string) $producto->id, 'nombre' => 'Chispa', 'cantidad' => 5, 'precio_unitario' => 900]], $put['items']);
        $this->assertEquals(4500, $put['total']);
        $this->assertSame($pedido->created_at->toIso8601String(), $put['creado_at']);

        // Ningún movimiento de stock local.
        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
        $this->assertEquals(5, $this->central->reservado('producto', $producto->id));
    }

    public function test_editar_el_color_a_eleccion_actualiza_la_nota_en_el_central(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $elegir = ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => 'A elección', 'color_hex' => '#000000', 'es_color_personalizado' => true, 'precio_adicional' => 0, 'stock' => null, 'is_active' => true]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $elegir->id, 'color_personalizado_texto' => 'Turquesa']]);

        $this->editar($pedido, $this->payload($pedido, [['color_personalizado_texto' => 'Violeta']]))->assertSessionHasNoErrors();

        $this->assertSame('Color: Violeta', $this->ultimoPut()['items'][0]['nota']);
        $this->assertSame('Violeta', $pedido->items()->first()->color_personalizado_texto);
    }

    public function test_si_el_central_rechaza_por_stock_la_edicion_no_se_guarda_y_se_muestra_el_motivo(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 500]);
        $roja = ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => 'Roja', 'color_hex' => '#ff0000', 'precio_adicional' => 0, 'stock' => 10, 'is_active' => true]);
        $this->central->disponible['variante:'.$roja->id] = 4;
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $roja->id]]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 9]]))
            ->assertSessionHasErrors(['items' => 'Solo quedan 4 unidades de Bengala (Roja) (pediste 9). Ajustá la cantidad.']);

        // Nada cambió: ni acá ni en el Central.
        $this->assertSame(2, $pedido->items()->first()->cantidad);
        $this->assertSame(1000.0, (float) $pedido->fresh()->total);
        $this->assertSame(1, $pedido->fresh()->rukoz_version);
        $this->assertSame(1, array_values($this->central->pedidos)[0]['version']);
    }

    public function test_editar_con_el_central_caido_no_guarda_nada(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $this->central->caido = true;

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 3]]))
            ->assertSessionHasErrors(['estado' => 'No pudimos comunicarnos con el Sistema Central, así que no se pudo guardar la edición. No se guardó ningún cambio: probá de nuevo en unos minutos.']);

        $this->assertSame(2, $pedido->items()->first()->cantidad);
        // El resultado es dudoso (¿llegó el PUT?): queda anotada la reversión al pedido anterior.
        $this->assertSame(1, Compensacion::query()->pendientes()->where('tipo', Compensacion::REVERTIR_EDICION)->count());
    }

    public function test_editar_un_pedido_que_el_central_ya_no_deja_editar_muestra_el_estado(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        array_values(array_keys($this->central->pedidos));
        $this->central->pedidos[$pedido->rukoz_ref]['estado'] = 'confirmado';

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 3]]))
            ->assertSessionHasErrors(['estado' => 'Este pedido ya no está en reserva en el Sistema Central (estado: confirmado): no se puede guardar la edición desde acá.']);

        $this->assertSame(2, $pedido->items()->first()->cantidad);
    }

    public function test_si_falla_la_edicion_local_despues_del_put_el_central_vuelve_al_pedido_anterior(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $anterior = $this->central->pedidos[$pedido->rukoz_ref]['payload'];

        // El primer save() es el del plan (se deshace); el segundo es el de verdad, ya con el Central actualizado.
        $guardados = 0;
        Pedido::saving(function () use (&$guardados) {
            if (++$guardados === 2) {
                throw new RuntimeException('falló la base');
            }
        });

        $this->withoutExceptionHandling();

        try {
            $this->editar($pedido, $this->payload($pedido, [['cantidad' => 7]]));
            $this->fail('Tendría que haber fallado');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame(2, $pedido->items()->first()->cantidad);
        $this->assertEquals($anterior['items'], $this->central->pedidos[$pedido->rukoz_ref]['payload']['items'], 'El Central tiene que volver al pedido anterior');
        $this->assertEquals(2, $this->central->reservado('producto', $producto->id));
    }

    public function test_editar_sin_cambiar_items_ni_precios_no_cambia_el_pedido_del_central(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);

        $this->editar($pedido, $this->payload($pedido))->assertSessionHasNoErrors();

        $this->assertSame(1, array_values($this->central->pedidos)[0]['version']);
        $this->assertSame(1, $pedido->fresh()->rukoz_version);
    }

    public function test_editar_el_cupon_no_cambia_el_cupo_solo_se_recalcula_el_monto(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'valor_descuento' => 10, 'limite_usos' => 5]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]], ['codigo_descuento' => 'DIEZ']);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 4]]))->assertSessionHasNoErrors();

        $this->assertSame(1, $cupon->fresh()->usos_actuales);
        $this->assertSame(400.0, (float) $pedido->fresh()->descuento_monto);
        $this->assertEquals(3600, $this->ultimoPut()['total']);
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Cancelar
    // ------------------------------------------------------------------------------------------------------------------

    public function test_cancelar_libera_la_reserva_del_central_y_el_cupon_sin_tocar_stock_local(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'limite_usos' => 5]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 3]], ['codigo_descuento' => 'DIEZ']);
        $this->assertSame(1, $cupon->fresh()->usos_actuales);

        $this->cambiarEstado($pedido, 'cancelado', ['motivo' => 'El cliente se arrepintió'])->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->estado);
        $this->assertSame('cancelado', $pedido->rukoz_estado);
        $this->assertSame('El cliente se arrepintió', $pedido->motivo_cancelacion);
        $this->assertSame('cancelado', $this->central->pedidos[$pedido->rukoz_ref]['estado']);
        $this->assertSame('El cliente se arrepintió', $this->central->pedidos[$pedido->rukoz_ref]['motivo']);
        $this->assertSame([], $this->central->vivos());
        $this->assertSame(0, $cupon->fresh()->usos_actuales);
        $this->assertNotNull($pedido->codigo_descuento_liberado_at);
        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
    }

    public function test_cancelar_con_el_central_caido_cancela_local_y_deja_la_cancelacion_en_compensacion(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'limite_usos' => 5]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 3]], ['codigo_descuento' => 'DIEZ']);
        $this->central->caido = true;

        $this->cambiarEstado($pedido, 'cancelado')->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->estado);
        $this->assertSame('cancelacion_pendiente', $pedido->rukoz_estado);
        $this->assertSame(0, $cupon->fresh()->usos_actuales);
        $this->assertSame(1, Compensacion::query()->pendientes()->where('tipo', Compensacion::CANCELAR)->where('ref', $pedido->rukoz_ref)->count());
        $this->assertCount(1, $this->central->vivos(), 'El Central todavía la tiene reservada');

        // Vuelve el Central: el cron del paquete cancela y el pedido local deja de estar «pendiente de liberar».
        $this->central->caido = false;
        $this->travel(2)->minutes();
        $this->artisan('rukoz:compensaciones')->assertSuccessful();

        $this->assertSame([], $this->central->vivos());
        $this->assertSame('cancelado', $pedido->fresh()->rukoz_estado);
    }

    public function test_cancelar_un_pedido_confirmado_en_el_central_no_se_puede_desde_la_web(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);
        $this->central->pedidos[$pedido->rukoz_ref]['estado'] = 'confirmado';

        $this->cambiarEstado($pedido, 'cancelado')
            ->assertSessionHasErrors(['estado' => 'Este pedido ya es una venta confirmada en el Sistema Central: se anula desde allá.']);

        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
    }

    public function test_pasar_a_despachado_y_volver_a_pendiente_no_toca_stock_ni_llama_al_central(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 3]]);
        $llamadas = count($this->central->llamadas);

        $this->cambiarEstado($pedido, 'despachado')->assertSessionHasNoErrors();
        $this->cambiarEstado($pedido, 'pendiente')->assertSessionHasNoErrors();

        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
        $this->assertCount($llamadas, $this->central->llamadas);
        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
    }

    // ------------------------------------------------------------------------------------------------------------------
    // Pedidos viejos (sin rukoz_ref) con el interruptor encendido
    // ------------------------------------------------------------------------------------------------------------------

    public function test_un_pedido_viejo_sin_rukoz_ref_se_edita_con_stock_local_y_sin_hablar_con_el_central(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprarSinCentral([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $this->assertSame(8, $producto->fresh()->stock);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 5]]))->assertSessionHasNoErrors();

        $this->assertSame(5, $pedido->items()->first()->cantidad);
        $this->assertSame(5, $producto->fresh()->stock); // ajustarPorEdicion: descuenta la diferencia
        $this->assertSame([], $this->central->llamadas);
    }

    public function test_un_pedido_viejo_sin_rukoz_ref_se_cancela_y_repone_stock_local(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $cupon = CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'limite_usos' => 5]);
        $pedido = $this->comprarSinCentral([['producto_id' => $producto->id, 'cantidad' => 3]]);

        $this->cambiarEstado($pedido, 'cancelado')->assertSessionHasNoErrors();

        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertNull($pedido->fresh()->rukoz_estado);
        $this->assertSame([], $this->central->llamadas);
    }

    public function test_el_servicio_de_stock_no_toca_un_pedido_con_rukoz_ref(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 3]]);
        $servicio = app(StockService::class);

        $servicio->descontar($pedido);
        $servicio->reponer($pedido);
        $servicio->ajustarPorEdicion($pedido, [], $servicio->operacionesDe($pedido));

        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
    }
}
