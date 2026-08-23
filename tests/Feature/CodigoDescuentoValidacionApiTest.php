<?php

namespace Tests\Feature;

use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodigoDescuentoValidacionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_devuelve_descuento_para_codigo_valido(): void
    {
        CodigoDescuento::factory()->create([
            'codigo' => 'VERANO15',
            'activo' => true,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 15,
        ]);

        $response = $this->postJson('/api/codigos-descuento/validar', [
            'codigo' => 'verano15',
            'subtotal' => 1000,
        ]);

        $response->assertOk();
        $response->assertJson([
            'valido' => true,
            'motivo' => null,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'monto_descuento' => 150,
            'subtotal_con_descuento' => 850,
        ]);
        $response->assertJsonStructure([
            'valido',
            'motivo',
            'codigo_descuento_id',
            'tipo_descuento',
            'valor_descuento',
            'monto_descuento',
            'subtotal_con_descuento',
        ]);
    }

    public function test_endpoint_devuelve_motivo_para_codigo_invalido(): void
    {
        $response = $this->postJson('/api/codigos-descuento/validar', [
            'codigo' => 'NOEXISTE',
            'subtotal' => 1000,
        ]);

        $response->assertOk();
        $response->assertExactJson([
            'valido' => false,
            'motivo' => 'Código inválido',
            'monto_descuento' => 0,
            'subtotal_con_descuento' => 1000,
        ]);
    }

    public function test_endpoint_rechaza_subtotal_negativo(): void
    {
        $response = $this->postJson('/api/codigos-descuento/validar', [
            'codigo' => 'CUALQUIERA',
            'subtotal' => -100,
        ]);

        $response->assertStatus(422);
    }

    public function test_endpoint_rechaza_subtotal_no_numerico(): void
    {
        $response = $this->postJson('/api/codigos-descuento/validar', [
            'codigo' => 'CUALQUIERA',
            'subtotal' => 'abc',
        ]);

        $response->assertStatus(422);
    }

    public function test_endpoint_es_publico_sin_autenticacion(): void
    {
        $response = $this->postJson('/api/codigos-descuento/validar', [
            'codigo' => 'CUALQUIERA',
            'subtotal' => 100,
        ]);

        $response->assertOk();
    }
}
