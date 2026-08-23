<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoConCodigoDescuentoTest extends TestCase
{
    use RefreshDatabase;

    private function payloadBase(array $items, ?string $codigoDescuento = null): array
    {
        return [
            'cliente_nombre' => 'Cliente de prueba',
            'cliente_dni' => null,
            'cliente_telefono' => null,
            'cliente_email' => null,
            'cliente_provincia' => null,
            'cliente_ciudad' => null,
            'cliente_codigo_postal' => null,
            'observaciones' => null,
            'codigo_descuento' => $codigoDescuento,
            'items' => $items,
        ];
    }

    private function cambiarEstado(Pedido $pedido, string $estado)
    {
        $user = User::factory()->create();

        return $this->actingAs($user)->patch(route('pedidos.cambiar-estado', $pedido), [
            'estado' => $estado,
        ]);
    }

    public function test_checkout_con_codigo_porcentaje_valido(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'VERANO15',
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 15,
            'usos_actuales' => 3,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 2],
        ], 'verano15'));

        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(2000.0, (float) $pedido->subtotal);
        $this->assertSame(300.0, (float) $pedido->descuento_monto);
        $this->assertSame(1700.0, (float) $pedido->total);
        $this->assertSame(1700.0, (float) $response->json('total'));

        $this->assertSame($codigo->id, $pedido->codigo_descuento_id);
        $this->assertSame('VERANO15', $pedido->codigo_descuento_texto);
        $this->assertSame(TipoDescuento::Porcentaje, $pedido->codigo_descuento_tipo);
        $this->assertSame(15.0, (float) $pedido->codigo_descuento_valor);

        $this->assertSame(4, $codigo->fresh()->usos_actuales);
    }

    public function test_checkout_con_codigo_fijo_mayor_al_subtotal_se_topea(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        CodigoDescuento::factory()->create([
            'codigo' => 'GRANDE',
            'tipo_descuento' => TipoDescuento::Fijo,
            'valor_descuento' => 5000,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'GRANDE'));

        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(1000.0, (float) $pedido->subtotal);
        $this->assertSame(1000.0, (float) $pedido->descuento_monto);
        $this->assertSame(0.0, (float) $pedido->total);
    }

    public function test_checkout_sin_codigo_deja_los_campos_nuevos_en_null_o_cero(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ]));

        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(1000.0, (float) $pedido->subtotal);
        $this->assertSame(1000.0, (float) $pedido->total);
        $this->assertSame(0.0, (float) $pedido->descuento_monto);
        $this->assertNull($pedido->codigo_descuento_id);
        $this->assertNull($pedido->codigo_descuento_texto);
        $this->assertNull($pedido->codigo_descuento_tipo);
        $this->assertNull($pedido->codigo_descuento_valor);
    }

    public function test_checkout_con_codigo_inexistente_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'NOEXISTE'));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['codigo_descuento']);
        $this->assertSame(0, Pedido::count());
    }

    public function test_checkout_con_codigo_inactivo_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'INACTIVO', 'activo' => false]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'INACTIVO'));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['codigo_descuento']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
    }

    public function test_checkout_con_codigo_vencido_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'VENCIDO',
            'vigente_hasta' => now()->subDay()->toDateString(),
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'VENCIDO'));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['codigo_descuento']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
    }

    public function test_checkout_con_codigo_de_usos_agotados_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'AGOTADO',
            'limite_usos' => 5,
            'usos_actuales' => 5,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'AGOTADO'));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['codigo_descuento']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(5, $codigo->fresh()->usos_actuales);
    }

    public function test_alcanzar_el_limite_exacto_el_segundo_checkout_inmediato_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'UNICO',
            'limite_usos' => 1,
            'usos_actuales' => 0,
        ]);

        $primera = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'UNICO'));

        $primera->assertCreated();
        $this->assertSame(1, $codigo->fresh()->usos_actuales);

        $segunda = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'UNICO'));

        $segunda->assertStatus(422);
        $segunda->assertJsonValidationErrors(['codigo_descuento']);
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
        $this->assertSame(1, Pedido::count());
    }

    /**
     * Fuerza que la validación optimista de stock diga "todo bien" (igual que
     * CheckoutStockTest::test_condicion_de_carrera...) mientras el stock real bajo
     * lock ya está en 0, para que descontar() aborte DESPUÉS de que el código ya
     * incrementó usos_actuales dentro de la misma transacción. El rollback tiene que
     * deshacer ambas cosas juntas.
     */
    public function test_rollback_si_falla_el_stock_despues_de_incrementar_usos_actuales(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 1]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'ROLLBACK10', 'usos_actuales' => 0]);

        $this->partialMock(StockService::class, function ($mock) {
            $mock->shouldReceive('validarDisponibilidad')->once()->andReturn([]);
        });

        $producto->update(['stock' => 0]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'ROLLBACK10'));

        $response->assertStatus(422);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
    }

    public function test_cancelar_pedido_con_codigo_libera_el_uso_y_conserva_el_snapshot(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'CANCELAR10',
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
            'usos_actuales' => 0,
        ]);

        $checkout = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'CANCELAR10'));

        $checkout->assertCreated();
        $this->assertSame(1, $codigo->fresh()->usos_actuales);

        $pedido = Pedido::findOrFail($checkout->json('id'));

        $response = $this->cambiarEstado($pedido, 'cancelado');

        $response->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(0, $codigo->fresh()->usos_actuales);

        // El historial no se borra al cancelar: solo se libera el cupo.
        $pedidoFresco = $pedido->fresh();
        $this->assertSame('CANCELAR10', $pedidoFresco->codigo_descuento_texto);
        $this->assertSame(100.0, (float) $pedidoFresco->descuento_monto);
        $this->assertSame($codigo->id, $pedidoFresco->codigo_descuento_id);
    }

    public function test_cancelar_dos_veces_seguidas_no_libera_el_uso_dos_veces(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'DOBLECANCEL', 'usos_actuales' => 0]);

        $checkout = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 'DOBLECANCEL'));

        $checkout->assertCreated();
        $pedido = Pedido::findOrFail($checkout->json('id'));
        $this->assertSame(1, $codigo->fresh()->usos_actuales);

        $primera = $this->cambiarEstado($pedido, 'cancelado');
        $primera->assertSessionHasNoErrors();
        $this->assertSame(0, $codigo->fresh()->usos_actuales);

        // La segunda llamada ya encuentra el pedido "cancelado": la rechaza la
        // validación de transición existente (Cancelado es terminal), sin llegar
        // siquiera a liberarUso() de nuevo.
        $segunda = $this->cambiarEstado($pedido->fresh(), 'cancelado');
        $segunda->assertSessionHasErrors(['estado']);

        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
    }
}
