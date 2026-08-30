<?php

namespace Tests\Unit\Services;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\Addon;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
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

    public function test_sin_variante_ni_addons_precio_final_con_opciones_igual_al_precio_final(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $result = $this->service->calcularPrecio($producto, 1);

        $this->assertNull($result->variante_aplicada);
        $this->assertSame(0.0, $result->recargo_variante);
        $this->assertSame([], $result->addons_aplicados);
        $this->assertSame(0.0, $result->addons_total);
        $this->assertSame(1000.0, $result->precio_final_con_opciones);
    }

    public function test_recargo_de_variante_se_suma_despues_del_descuento_de_la_oferta(): void
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

        $result = $this->service->calcularPrecio($producto, 1, $variante->id);

        $this->assertSame(800.0, $result->precio_unitario_final);
        $this->assertSame(150.0, $result->recargo_variante);
        // El descuento de la oferta (20% de 1000) no se recalcula sobre 800+150.
        $this->assertSame(950.0, $result->precio_final_con_opciones);
        $this->assertSame(200.0, $result->ahorro_unitario);
    }

    public function test_variante_que_no_pertenece_al_producto_lanza_validation_exception(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $otroProducto = Producto::factory()->create(['precio' => 500]);
        $varianteAjena = ProductoVariante::create([
            'producto_id' => $otroProducto->id,
            'nombre' => 'Azul',
            'precio_adicional' => 50,
            'is_active' => true,
        ]);

        $this->expectException(ValidationException::class);

        $this->service->calcularPrecio($producto, 1, $varianteAjena->id);
    }

    public function test_variante_inactiva_lanza_validation_exception(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $varianteInactiva = ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Verde',
            'precio_adicional' => 50,
            'is_active' => false,
        ]);

        $this->expectException(ValidationException::class);

        $this->service->calcularPrecio($producto, 1, $varianteInactiva->id);
    }

    public function test_addons_total_usa_precio_override_cuando_esta_seteado_y_precio_por_defecto_si_no(): void
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

        $result = $this->service->calcularPrecio($producto, 1, null, [$addonConOverride->id, $addonSinOverride->id]);

        $this->assertSame(900.0, $result->precio_unitario_final);
        $this->assertSame(350.0, $result->addons_total);
        $this->assertSame(1250.0, $result->precio_final_con_opciones);
        $this->assertCount(2, $result->addons_aplicados);
    }

    public function test_addon_no_asociado_al_producto_lanza_validation_exception(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $addonNoAsociado = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'is_active' => true]);

        $this->expectException(ValidationException::class);

        $this->service->calcularPrecio($producto, 1, null, [$addonNoAsociado->id]);
    }

    public function test_addon_inactivo_lanza_validation_exception(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $addonInactivo = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'is_active' => false]);
        $producto->addons()->attach($addonInactivo->id, ['orden' => 0]);

        $this->expectException(ValidationException::class);

        $this->service->calcularPrecio($producto, 1, null, [$addonInactivo->id]);
    }

    public function test_cantidad_para_escala_resuelve_la_escala_por_ese_numero_no_por_la_cantidad_de_la_linea(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 800,
        ]);

        // La línea tiene 2 unidades (no llega sola a la escala de 5), pero el total
        // de la compra para este producto son 5 — se cobra al precio de la escala.
        $result = $this->service->calcularPrecio($producto, 2, null, [], false, 5);

        $this->assertNotNull($result->escala_aplicada);
        $this->assertSame($escala->id, $result->escala_aplicada->id);
        $this->assertSame(800.0, $result->precio_unitario_final);
    }

    public function test_sin_cantidad_para_escala_usa_la_cantidad_de_la_linea(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 800,
        ]);

        $result = $this->service->calcularPrecio($producto, 2);

        $this->assertNull($result->escala_aplicada);
        $this->assertSame(1000.0, $result->precio_unitario_final);
    }
}
