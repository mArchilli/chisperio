<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\Addon;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductoPrecioApiTest extends TestCase
{
    use RefreshDatabase;

    private function shapeEsperado(Producto $producto, int $cantidad, ?int $varianteId = null, array $addonIds = []): array
    {
        $resultado = app(PricingService::class)->calcularPrecio($producto->fresh(), $cantidad, $varianteId, $addonIds);

        return [
            'precio_base' => $resultado->precio_lista,
            'descuento_aplicado' => $resultado->oferta_aplicada !== null,
            'ahorro' => $resultado->ahorro_unitario,
            'ahorro_porcentaje' => $resultado->ahorro_porcentaje,
            'recargo_variante' => $resultado->recargo_variante,
            'addons_total' => $resultado->addons_total,
            'precio_final_unitario' => $resultado->precio_final_con_opciones,
        ];
    }

    public function test_endpoint_devuelve_el_mismo_resultado_que_pricing_service_para_varias_cantidades(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
        ]);

        // Un valor bajo (sin escala), uno justo en el umbral, y uno alto (con escala).
        foreach ([5, 10, 50] as $cantidad) {
            $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad={$cantidad}");

            $response->assertOk();
            $response->assertExactJson($this->shapeEsperado($producto, $cantidad));
        }
    }

    public function test_endpoint_suma_recargo_de_variante_despues_del_descuento(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 20,
        ]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Rojo',
            'precio_adicional' => 150,
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=1&variante_id={$variante->id}");

        $response->assertOk();
        $response->assertExactJson($this->shapeEsperado($producto, 1, $variante->id));
        // 1000 - 20% = 800 de precio con descuento; +150 de variante = 950. El recargo
        // de variante NO se descuenta (la oferta ya se aplicó antes de sumarlo).
        $response->assertJson([
            'precio_base' => 1000.0,
            'descuento_aplicado' => true,
            'recargo_variante' => 150.0,
            'precio_final_unitario' => 950.0,
        ]);
    }

    public function test_endpoint_suma_total_de_addons_despues_del_descuento(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
        ]);
        $addonConOverride = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'is_active' => true]);
        $addonSinOverride = Addon::create(['nombre' => 'Envoltorio', 'precio' => 100, 'is_active' => true]);
        $producto->addons()->attach($addonConOverride->id, ['precio_override' => 250, 'orden' => 0]);
        $producto->addons()->attach($addonSinOverride->id, ['precio_override' => null, 'orden' => 1]);

        $addonIds = [$addonConOverride->id, $addonSinOverride->id];
        $query = "cantidad=1&addon_ids[]={$addonConOverride->id}&addon_ids[]={$addonSinOverride->id}";
        $response = $this->getJson("/api/productos/{$producto->id}/precio?{$query}");

        $response->assertOk();
        $response->assertExactJson($this->shapeEsperado($producto, 1, null, $addonIds));
        // 1000 - 10% = 900; + 250 (override) + 100 (precio por defecto) = 1250.
        $response->assertJson([
            'addons_total' => 350.0,
            'precio_final_unitario' => 1250.0,
        ]);
    }

    public function test_endpoint_rechaza_variante_que_no_pertenece_al_producto(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $otroProducto = Producto::factory()->create(['precio' => 500]);
        $varianteAjena = ProductoVariante::create([
            'producto_id' => $otroProducto->id,
            'nombre' => 'Azul',
            'precio_adicional' => 50,
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=1&variante_id={$varianteAjena->id}");

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_variante_inactiva(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $varianteInactiva = ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Verde',
            'precio_adicional' => 50,
            'is_active' => false,
        ]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=1&variante_id={$varianteInactiva->id}");

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_addon_no_asociado_al_producto(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $addonNoAsociado = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'is_active' => true]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=1&addon_ids[]={$addonNoAsociado->id}");

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_addon_inactivo(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $addonInactivo = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'is_active' => false]);
        $producto->addons()->attach($addonInactivo->id, ['orden' => 0]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=1&addon_ids[]={$addonInactivo->id}");

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_cantidad_cero(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=0");

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_cantidad_negativa(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=-3");

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_cantidad_no_entera(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $response = $this->getJson("/api/productos/{$producto->id}/precio?cantidad=abc");

        $response->assertStatus(422);
    }
}
