<?php

namespace Tests\Feature;

use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\PlanPagoTarjeta;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoConPlanPagoTarjetaTest extends TestCase
{
    use RefreshDatabase;

    private function payloadBase(array $items, ?int $planPagoTarjetaId = null): array
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
            'codigo_descuento' => null,
            'plan_pago_tarjeta_id' => $planPagoTarjetaId,
            'items' => $items,
        ];
    }

    public function test_checkout_con_plan_activo_calcula_y_guarda_el_recargo_sobre_el_total_server_side(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $plan = PlanPagoTarjeta::create([
            'nombre' => '3 cuotas',
            'cuotas' => 3,
            'recargo_porcentaje' => 20,
            'orden' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 2],
        ], $plan->id));

        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));

        // subtotal/total = 2000 sin descuento; recargo del 20% = 400; total con recargo = 2400.
        $this->assertSame(2000.0, (float) $pedido->total);
        $this->assertSame($plan->id, $pedido->plan_pago_tarjeta_id);
        $this->assertSame('3 cuotas', $pedido->plan_pago_nombre);
        $this->assertSame(3, $pedido->plan_pago_cuotas);
        $this->assertSame(20.0, (float) $pedido->recargo_porcentaje);
        $this->assertSame(400.0, (float) $pedido->recargo_monto);
        $this->assertSame(2400.0, (float) $pedido->total_con_recargo);
    }

    public function test_checkout_sin_plan_deja_los_campos_de_plan_de_pago_en_null(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ]));

        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));

        $this->assertNull($pedido->plan_pago_tarjeta_id);
        $this->assertNull($pedido->plan_pago_nombre);
        $this->assertNull($pedido->plan_pago_cuotas);
        $this->assertNull($pedido->recargo_porcentaje);
        $this->assertNull($pedido->recargo_monto);
        $this->assertNull($pedido->total_con_recargo);
    }

    public function test_checkout_con_plan_inactivo_se_rechaza_y_no_crea_el_pedido(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $plan = PlanPagoTarjeta::create([
            'nombre' => '6 cuotas',
            'cuotas' => 6,
            'recargo_porcentaje' => 35,
            'orden' => 1,
            'is_active' => false,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], $plan->id));

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('plan_pago_tarjeta_id');
        $this->assertSame(0, Pedido::count());
        $this->assertSame(10, $producto->fresh()->stock);
    }

    public function test_checkout_con_plan_inexistente_se_rechaza_y_no_crea_el_pedido(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], 999999));

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('plan_pago_tarjeta_id');
        $this->assertSame(0, Pedido::count());
    }

    /**
     * Punto 6 del QA: el navegador solo puede mandar el ID del plan, nunca un monto.
     * Si igual intenta colar recargo_monto/total_con_recargo/total falsos en el body,
     * el controller los ignora por completo (no están en las reglas de validate() ni
     * se leen de $request en ningún punto) y persiste lo recalculado server-side.
     */
    public function test_checkout_ignora_montos_de_recargo_falsos_mandados_en_el_request(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $plan = PlanPagoTarjeta::create([
            'nombre' => '3 cuotas',
            'cuotas' => 3,
            'recargo_porcentaje' => 20,
            'orden' => 1,
            'is_active' => true,
        ]);

        $payload = $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], $plan->id);

        // Intento de manipulación: el cliente manda un recargo/total inventados,
        // muy por debajo de lo que realmente corresponde (1000 + 20% = 1200).
        $payload['recargo_monto'] = 1;
        $payload['total_con_recargo'] = 1001;
        $payload['total'] = 1001;
        $payload['recargo_porcentaje'] = 0.1;

        $response = $this->postJson('/checkout', $payload);

        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));

        $this->assertSame(1000.0, (float) $pedido->total);
        $this->assertSame(20.0, (float) $pedido->recargo_porcentaje);
        $this->assertSame(200.0, (float) $pedido->recargo_monto);
        $this->assertSame(1200.0, (float) $pedido->total_con_recargo);
    }

    public function test_recargo_se_calcula_sobre_el_total_ya_con_codigo_de_descuento_aplicado(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'DESC10',
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
        ]);
        $plan = PlanPagoTarjeta::create([
            'nombre' => '3 cuotas',
            'cuotas' => 3,
            'recargo_porcentaje' => 20,
            'orden' => 1,
            'is_active' => true,
        ]);

        $payload = $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], $plan->id);
        $payload['codigo_descuento'] = 'DESC10';

        $response = $this->postJson('/checkout', $payload);
        $response->assertCreated();

        $pedido = Pedido::findOrFail($response->json('id'));

        // subtotal 1000, -10% descuento = 900 (total), recargo 20% sobre 900 = 180,
        // total_con_recargo = 1080. Si el recargo se calculara mal sobre el subtotal
        // bruto (1000) en vez del total con descuento (900), esto daría 200/1200.
        $this->assertSame(1000.0, (float) $pedido->subtotal);
        $this->assertSame(900.0, (float) $pedido->total);
        $this->assertSame(100.0, (float) $pedido->descuento_monto);
        $this->assertSame(180.0, (float) $pedido->recargo_monto);
        $this->assertSame(1080.0, (float) $pedido->total_con_recargo);
    }

    public function test_desactivar_un_plan_no_rompe_el_snapshot_del_pedido_historico(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $plan = PlanPagoTarjeta::create([
            'nombre' => '3 cuotas',
            'cuotas' => 3,
            'recargo_porcentaje' => 20,
            'orden' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ], $plan->id));
        $response->assertCreated();
        $pedidoId = $response->json('id');

        // El admin desactiva el plan DESPUÉS de que ya se usó en el pedido de arriba.
        $plan->update(['is_active' => false]);

        $show = $this->actingAs($user)->get(route('pedidos.show', $pedidoId));

        $show->assertOk();
        $show->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Show')
            ->where('pedido.plan_pago_tarjeta_id', $plan->id)
            ->where('pedido.plan_pago_nombre', '3 cuotas')
            ->where('pedido.plan_pago_cuotas', 3)
            ->where('pedido.recargo_monto', '200.00')
            ->where('pedido.total_con_recargo', '1200.00')
        );

        // Un pedido NUEVO con ese mismo plan (ya inactivo) tiene que seguir rechazándose.
        $productoNuevo = Producto::factory()->create(['precio' => 500, 'stock' => 5]);
        $nuevoIntento = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $productoNuevo->id, 'cantidad' => 1],
        ], $plan->id));
        $nuevoIntento->assertUnprocessable();
        $nuevoIntento->assertJsonValidationErrors('plan_pago_tarjeta_id');
    }
}
