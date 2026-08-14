<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductoPrecioApiTest extends TestCase
{
    use RefreshDatabase;

    private function shapeEsperado(Producto $producto, int $cantidad): array
    {
        $resultado = app(PricingService::class)->calcularPrecio($producto->fresh(), $cantidad);

        return [
            'precio_lista' => $resultado->precio_lista,
            'precio_unitario_final' => $resultado->precio_unitario_final,
            'ahorro_porcentaje' => $resultado->ahorro_porcentaje,
            'oferta_aplicada' => $resultado->oferta_aplicada !== null,
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
