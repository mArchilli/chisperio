<?php

namespace Tests\Unit\Services;

use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use App\Services\CodigoDescuentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodigoDescuentoServiceTest extends TestCase
{
    use RefreshDatabase;

    private CodigoDescuentoService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new CodigoDescuentoService();
    }

    public function test_codigo_inexistente_es_invalido(): void
    {
        $resultado = $this->service->validar('NOEXISTE', 1000);

        $this->assertFalse($resultado['valido']);
        $this->assertSame('Código inválido', $resultado['motivo']);
        $this->assertSame(0, $resultado['monto_descuento']);
        $this->assertSame(1000.0, $resultado['subtotal_con_descuento']);
    }

    public function test_codigo_inactivo_es_invalido(): void
    {
        CodigoDescuento::factory()->create(['codigo' => 'INACTIVO', 'activo' => false]);

        $resultado = $this->service->validar('INACTIVO', 1000);

        $this->assertFalse($resultado['valido']);
        $this->assertSame('Este código ya no está activo', $resultado['motivo']);
    }

    public function test_codigo_vencido_es_invalido(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'VENCIDO',
            'activo' => true,
            'vigente_hasta' => now()->subDay()->toDateString(),
        ]);

        $resultado = $this->service->validar('VENCIDO', 1000);

        $this->assertFalse($resultado['valido']);
        $this->assertSame('Este código venció', $resultado['motivo']);
    }

    public function test_codigo_todavia_no_vigente_es_invalido(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'FUTURO',
            'activo' => true,
            'vigente_desde' => now()->addDay()->toDateString(),
        ]);

        $resultado = $this->service->validar('FUTURO', 1000);

        $this->assertFalse($resultado['valido']);
        $this->assertSame('Este código todavía no está vigente', $resultado['motivo']);
    }

    public function test_codigo_con_limite_de_usos_alcanzado_es_invalido(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'AGOTADO',
            'activo' => true,
            'limite_usos' => 5,
            'usos_actuales' => 5,
        ]);

        $resultado = $this->service->validar('AGOTADO', 1000);

        $this->assertFalse($resultado['valido']);
        $this->assertSame('Este código alcanzó su límite de usos', $resultado['motivo']);
    }

    public function test_codigo_porcentaje_calcula_monto_proporcional(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'VERANO15',
            'activo' => true,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 15,
        ]);

        $resultado = $this->service->validar('VERANO15', 1000);

        $this->assertTrue($resultado['valido']);
        $this->assertNull($resultado['motivo']);
        $this->assertSame(150.0, $resultado['monto_descuento']);
        $this->assertSame(850.0, $resultado['subtotal_con_descuento']);
        $this->assertSame('porcentaje', $resultado['tipo_descuento']);
        $this->assertSame(15.0, $resultado['valor_descuento']);
    }

    public function test_codigo_fijo_mayor_al_subtotal_se_topea_sin_quedar_negativo(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'GRANDE',
            'activo' => true,
            'tipo_descuento' => TipoDescuento::Fijo,
            'valor_descuento' => 2000,
        ]);

        $resultado = $this->service->validar('GRANDE', 1000);

        $this->assertTrue($resultado['valido']);
        $this->assertSame(1000.0, $resultado['monto_descuento']);
        $this->assertSame(0.0, $resultado['subtotal_con_descuento']);
    }

    public function test_codigo_fijo_menor_al_subtotal_descuenta_el_monto_exacto(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'CHICO',
            'activo' => true,
            'tipo_descuento' => TipoDescuento::Fijo,
            'valor_descuento' => 300,
        ]);

        $resultado = $this->service->validar('CHICO', 1000);

        $this->assertTrue($resultado['valido']);
        $this->assertSame(300.0, $resultado['monto_descuento']);
        $this->assertSame(700.0, $resultado['subtotal_con_descuento']);
    }

    public function test_busqueda_case_insensitive(): void
    {
        CodigoDescuento::factory()->create(['codigo' => 'VERANO10']);

        $resultado = $this->service->validar('verano10', 1000);

        $this->assertTrue($resultado['valido']);
    }

    /**
     * Blindaje: si alguien agrega el incremento de usos_actuales acá más adelante
     * sin darse cuenta de que rompe el contrato de esta fase (la validación es solo
     * una previsualización, el uso se consume recién en el checkout de Fase 4), este
     * test lo va a detectar.
     */
    public function test_validar_no_incrementa_usos_actuales(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'NOCONSUME',
            'activo' => true,
            'usos_actuales' => 3,
        ]);

        $this->service->validar('NOCONSUME', 1000);
        $this->service->validar('noconsume', 500);

        $this->assertSame(3, $codigo->fresh()->usos_actuales);
    }
}
