<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Services\CalculadoraPedido;
use App\Services\CodigoDescuentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El uso de un cupón es el pedido que lo aplicó; consumirUso()/liberarUso() dejan una marca
 * en el pedido para que repetir la operación (reintentos, eventos duplicados) no sume ni
 * reste dos veces.
 */
class CodigoDescuentoIdempotenciaTest extends TestCase
{
    use RefreshDatabase;

    private function pedidoConCupon(CodigoDescuento $codigo): Pedido
    {
        return Pedido::create([
            'cliente_nombre' => 'Cliente',
            'subtotal' => 1000,
            'total' => 900,
            'estado' => EstadoPedido::Pendiente,
            'codigo_descuento_id' => $codigo->id,
            'codigo_descuento_texto' => $codigo->codigo,
            'codigo_descuento_tipo' => 'porcentaje',
            'codigo_descuento_valor' => 10,
            'descuento_monto' => 100,
        ]);
    }

    public function test_liberar_dos_veces_el_mismo_pedido_solo_libera_un_uso(): void
    {
        $service = app(CodigoDescuentoService::class);
        $codigo = CodigoDescuento::factory()->create(['usos_actuales' => 3]);
        $otroPedido = $this->pedidoConCupon($codigo);
        $pedido = $this->pedidoConCupon($codigo);

        $service->liberarUso($pedido);
        $this->assertSame(2, $codigo->fresh()->usos_actuales);
        $this->assertNotNull($pedido->codigo_descuento_liberado_at);

        // Reintento con la misma instancia, y con una instancia nueva leída de la base.
        $service->liberarUso($pedido);
        $service->liberarUso(Pedido::find($pedido->id));
        $service->liberarUso(Pedido::find($pedido->id));

        $this->assertSame(2, $codigo->fresh()->usos_actuales);
        $this->assertNotNull($pedido->fresh()->codigo_descuento_liberado_at);
        // El otro pedido sigue sin liberar: liberarlo sí descuenta (es otro uso).
        $this->assertNull($otroPedido->fresh()->codigo_descuento_liberado_at);
        $service->liberarUso($otroPedido);
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
    }

    public function test_liberar_nunca_baja_de_cero_y_igual_deja_la_marca(): void
    {
        $codigo = CodigoDescuento::factory()->create(['usos_actuales' => 0]);
        $pedido = $this->pedidoConCupon($codigo);

        app(CodigoDescuentoService::class)->liberarUso($pedido);

        $this->assertSame(0, $codigo->fresh()->usos_actuales);
        $this->assertNotNull($pedido->fresh()->codigo_descuento_liberado_at);
    }

    public function test_liberar_un_pedido_sin_cupon_no_hace_nada(): void
    {
        $pedido = Pedido::create(['cliente_nombre' => 'Cliente', 'subtotal' => 10, 'total' => 10]);

        app(CodigoDescuentoService::class)->liberarUso($pedido);

        $this->assertNull($pedido->fresh()->codigo_descuento_liberado_at);
    }

    public function test_consumir_dos_veces_el_mismo_pedido_solo_suma_un_uso(): void
    {
        $service = app(CodigoDescuentoService::class);
        $codigo = CodigoDescuento::factory()->create(['usos_actuales' => 0]);
        $pedido = $this->pedidoConCupon($codigo);

        $service->consumirUso($pedido);
        $service->consumirUso($pedido);
        $service->consumirUso(Pedido::find($pedido->id));

        $this->assertSame(1, $codigo->fresh()->usos_actuales);
        $this->assertNotNull($pedido->fresh()->codigo_descuento_consumido_at);
    }

    public function test_no_se_consume_un_pedido_cuyo_uso_ya_fue_liberado(): void
    {
        $service = app(CodigoDescuentoService::class);
        $codigo = CodigoDescuento::factory()->create(['usos_actuales' => 1]);
        $pedido = $this->pedidoConCupon($codigo);

        $service->liberarUso($pedido);
        $service->consumirUso($pedido);

        $this->assertSame(0, $codigo->fresh()->usos_actuales);
    }

    public function test_el_checkout_consume_el_uso_una_vez_y_deja_la_marca(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'UNA', 'usos_actuales' => 0]);

        $response = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente',
            'codigo_descuento' => 'UNA',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ]);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
        $this->assertNotNull($pedido->codigo_descuento_consumido_at);
        $this->assertNull($pedido->codigo_descuento_liberado_at);

        // Reintentar el consumo del mismo pedido no suma.
        app(CodigoDescuentoService::class)->consumirUso($pedido);
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
    }

    public function test_cancelar_el_pedido_libera_el_uso_y_cancelar_de_nuevo_no_vuelve_a_liberar(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'UNA', 'usos_actuales' => 0]);
        $admin = User::factory()->create();

        $id = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente',
            'codigo_descuento' => 'UNA',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ])->json('id');
        $otro = $this->postJson('/checkout', [
            'cliente_nombre' => 'Otro',
            'codigo_descuento' => 'UNA',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ])->json('id');
        $this->assertSame(2, $codigo->fresh()->usos_actuales);

        $this->actingAs($admin)->patch(route('pedidos.cambiar-estado', $id), ['estado' => 'cancelado'])->assertSessionHasNoErrors();
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
        $this->assertNotNull(Pedido::find($id)->codigo_descuento_liberado_at);

        // Un segundo intento (la transición ya no es válida) ni cambia el contador ni libera el otro pedido.
        $this->actingAs($admin)->patch(route('pedidos.cambiar-estado', $id), ['estado' => 'cancelado'])->assertSessionHasErrors('estado');
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
        $this->assertNull(Pedido::find($otro)->codigo_descuento_liberado_at);
    }

    public function test_la_calculadora_no_escribe_nada_ni_consume_el_cupon(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'UNA', 'usos_actuales' => 0]);

        $calculo = app(CalculadoraPedido::class)->calcular([
            'items' => [['producto_id' => $producto->id, 'cantidad' => 3]],
            'codigo_descuento' => 'una',
        ]);

        $this->assertSame(3000.0, $calculo->subtotal);
        $this->assertSame(300.0, (float) $calculo->descuento['descuento_monto']);
        $this->assertSame(2700.0, $calculo->total);
        $this->assertCount(1, $calculo->items);
        $this->assertSame($codigo->id, $calculo->codigoDescuento()->id);

        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, \App\Models\PedidoItem::count());
        $this->assertSame(0, \App\Models\MovimientoStock::count());
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
        $this->assertSame(10, $producto->fresh()->stock);
    }
}
