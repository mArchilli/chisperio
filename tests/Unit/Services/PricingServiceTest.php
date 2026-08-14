<?php

namespace Tests\Unit\Services;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    private PricingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new PricingService();
    }

    public function test_producto_sin_escalas_sin_oferta_usa_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertSame(1000.0, $result->precio_lista);
        $this->assertSame(1000.0, $result->precio_unitario_final);
        $this->assertNull($result->oferta_aplicada);
        $this->assertNull($result->escala_aplicada);
        $this->assertSame(0.0, $result->ahorro_unitario);
        $this->assertSame(0.0, $result->ahorro_porcentaje);
    }

    public function test_cantidad_que_cae_en_una_escala_usa_esa_escala(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);

        $result = $this->service->calcularPrecio($producto, 15);

        $this->assertSame(800.0, $result->precio_lista);
        $this->assertSame(800.0, $result->precio_unitario_final);
        $this->assertNotNull($result->escala_aplicada);
        $this->assertSame($escala->id, $result->escala_aplicada->id);
    }

    public function test_cantidad_menor_a_la_primera_escala_usa_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);

        $result = $this->service->calcularPrecio($producto, 5);

        $this->assertSame(1000.0, $result->precio_lista);
        $this->assertNull($result->escala_aplicada);
    }

    public function test_cantidad_igual_a_cantidad_minima_toma_esa_escala(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escalaBaja = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 900,
        ]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);

        $result = $this->service->calcularPrecio($producto, 5);

        $this->assertSame(900.0, $result->precio_lista);
        $this->assertSame($escalaBaja->id, $result->escala_aplicada->id);
    }

    public function test_cantidad_entre_dos_umbrales_toma_la_escala_mas_baja(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala5 = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 900,
        ]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 100,
            'precio_unitario' => 700,
        ]);

        $result = $this->service->calcularPrecio($producto, 50);

        $this->assertSame(900.0, $result->precio_lista);
        $this->assertSame($escala5->id, $result->escala_aplicada->id);
    }

    public function test_oferta_alcance_todos_porcentaje_sobre_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $oferta = Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 20,
        ]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertSame(1000.0, $result->precio_lista);
        $this->assertSame(800.0, $result->precio_unitario_final);
        $this->assertNotNull($result->oferta_aplicada);
        $this->assertSame($oferta->id, $result->oferta_aplicada->id);
        $this->assertSame(200.0, $result->ahorro_unitario);
        $this->assertSame(20.0, $result->ahorro_porcentaje);
    }

    public function test_oferta_alcance_todos_fijo_sobre_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Fijo,
            'valor_descuento' => 150,
        ]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertSame(1000.0, $result->precio_lista);
        $this->assertSame(850.0, $result->precio_unitario_final);
        $this->assertSame(150.0, $result->ahorro_unitario);
        $this->assertSame(15.0, $result->ahorro_porcentaje);
    }

    public function test_oferta_alcance_todos_se_aplica_sobre_precio_de_escala_no_sobre_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
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

        $result = $this->service->calcularPrecio($producto, 15);

        $this->assertSame($escala->id, $result->escala_aplicada->id);
        $this->assertSame(800.0, $result->precio_lista);
        // 10% de descuento sobre 800 (precio de escala), no sobre 1000 (precio base).
        $this->assertSame(720.0, $result->precio_unitario_final);
    }

    public function test_oferta_alcance_especifico_apuntando_a_la_misma_escala_se_aplica(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escala->id,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 25,
        ]);

        $result = $this->service->calcularPrecio($producto, 15);

        $this->assertSame(800.0, $result->precio_lista);
        $this->assertSame(600.0, $result->precio_unitario_final);
        $this->assertNotNull($result->oferta_aplicada);
    }

    public function test_oferta_alcance_especifico_apuntando_a_otra_escala_no_se_aplica(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escalaResuelta = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        $otraEscala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 100,
            'precio_unitario' => 600,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $otraEscala->id,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 25,
        ]);

        $result = $this->service->calcularPrecio($producto, 15);

        $this->assertSame($escalaResuelta->id, $result->escala_aplicada->id);
        $this->assertSame(800.0, $result->precio_lista);
        $this->assertSame(800.0, $result->precio_unitario_final);
        $this->assertNull($result->oferta_aplicada);
        $this->assertSame(0.0, $result->ahorro_unitario);
    }

    public function test_oferta_alcance_especifico_apuntando_al_precio_base_no_se_aplica_si_hay_escala(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => null,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 25,
        ]);

        $result = $this->service->calcularPrecio($producto, 15);

        $this->assertSame(800.0, $result->precio_unitario_final);
        $this->assertNull($result->oferta_aplicada);
    }

    public function test_oferta_alcance_especifico_apuntando_al_precio_base_se_aplica_sin_escala(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => null,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 25,
        ]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertNull($result->escala_aplicada);
        $this->assertSame(750.0, $result->precio_unitario_final);
        $this->assertNotNull($result->oferta_aplicada);
    }

    public function test_oferta_fuera_de_rango_de_fechas_no_se_aplica(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 50,
            'fecha_inicio' => now()->subDays(10),
            'fecha_fin' => now()->subDay(),
        ]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertSame(1000.0, $result->precio_unitario_final);
        $this->assertNull($result->oferta_aplicada);
    }

    public function test_oferta_inactiva_no_se_aplica_sin_importar_alcance(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 50,
            'is_active' => false,
        ]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertSame(1000.0, $result->precio_unitario_final);
        $this->assertNull($result->oferta_aplicada);
    }

    public function test_descuento_fijo_mayor_al_precio_lista_se_clampea_a_cero(): void
    {
        $producto = Producto::factory()->create(['precio' => 100]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Fijo,
            'valor_descuento' => 500,
        ]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertSame(100.0, $result->precio_lista);
        $this->assertSame(0.0, $result->precio_unitario_final);
        $this->assertSame(100.0, $result->ahorro_unitario);
        $this->assertSame(100.0, $result->ahorro_porcentaje);
    }
}
