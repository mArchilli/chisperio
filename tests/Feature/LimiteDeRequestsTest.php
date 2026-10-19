<?php

namespace Tests\Feature;

use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Throttle por IP de los dos endpoints públicos que escriben o permiten enumerar:
 * POST /checkout y POST /api/codigos-descuento/validar. Los topes salen de config/limites.php.
 */
class LimiteDeRequestsTest extends TestCase
{
    use RefreshDatabase;

    private function checkout(Producto $producto, string $ip = '203.0.113.7')
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip])->postJson('/checkout', [
            'cliente_nombre' => 'Cliente',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ]);
    }

    public function test_el_checkout_responde_429_con_mensaje_amable_al_superar_el_limite(): void
    {
        config(['limites.checkout_por_minuto' => 3]);
        $producto = Producto::factory()->create(['precio' => 100]);

        $this->checkout($producto)->assertCreated();
        $this->checkout($producto)->assertCreated();
        $this->checkout($producto)->assertCreated();

        $respuesta = $this->checkout($producto);

        $respuesta->assertStatus(429)->assertJson(['message' => 'Esperá un momento y probá de nuevo.']);
        $respuesta->assertHeader('Retry-After');
        // El cuarto intento no llegó a crear nada.
        $this->assertSame(3, Pedido::count());
    }

    public function test_el_limite_del_checkout_es_por_ip(): void
    {
        config(['limites.checkout_por_minuto' => 1]);
        $producto = Producto::factory()->create(['precio' => 100]);

        $this->checkout($producto, '203.0.113.1')->assertCreated();
        $this->checkout($producto, '203.0.113.1')->assertStatus(429);
        $this->checkout($producto, '203.0.113.2')->assertCreated();
    }

    public function test_el_checkout_vuelve_a_andar_cuando_pasa_el_minuto(): void
    {
        config(['limites.checkout_por_minuto' => 1]);
        $producto = Producto::factory()->create(['precio' => 100]);

        $this->checkout($producto)->assertCreated();
        $this->checkout($producto)->assertStatus(429);

        $this->travel(61)->seconds();

        $this->checkout($producto)->assertCreated();
    }

    public function test_la_validacion_de_codigos_responde_429_al_superar_el_limite(): void
    {
        config(['limites.validar_cupon_por_minuto' => 2]);
        CodigoDescuento::factory()->create(['codigo' => 'BUENO']);

        $validar = fn () => $this->postJson('/api/codigos-descuento/validar', ['codigo' => 'BUENO', 'subtotal' => 1000]);

        $validar()->assertOk();
        $validar()->assertOk();
        $validar()->assertStatus(429)->assertJson(['message' => 'Esperá un momento y probá de nuevo.']);
    }

    public function test_los_limites_por_defecto_son_10_y_30_por_minuto(): void
    {
        $this->assertSame(10, config('limites.checkout_por_minuto'));
        $this->assertSame(30, config('limites.validar_cupon_por_minuto'));
    }

    public function test_los_dos_endpoints_tienen_limitadores_independientes(): void
    {
        config(['limites.checkout_por_minuto' => 1, 'limites.validar_cupon_por_minuto' => 5]);
        $producto = Producto::factory()->create(['precio' => 100]);
        CodigoDescuento::factory()->create(['codigo' => 'BUENO']);

        $this->checkout($producto)->assertCreated();
        $this->checkout($producto)->assertStatus(429);

        // Que el checkout esté agotado no frena la validación de cupones de la misma IP.
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
            ->postJson('/api/codigos-descuento/validar', ['codigo' => 'BUENO', 'subtotal' => 1000])
            ->assertOk();
    }
}
