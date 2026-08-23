<?php

namespace Tests\Feature;

use App\Models\CodigoDescuento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodigoDescuentoTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_puede_crear_codigo_porcentaje(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'VERANO10',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
        ]);

        $response->assertRedirect(route('codigos-descuento.index'));
        $this->assertDatabaseHas('codigos_descuento', [
            'codigo' => 'VERANO10',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
            'activo' => true,
        ]);
    }

    public function test_admin_puede_crear_codigo_fijo(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'DESC500',
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 500,
        ]);

        $response->assertRedirect(route('codigos-descuento.index'));
        $this->assertDatabaseHas('codigos_descuento', [
            'codigo' => 'DESC500',
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 500,
        ]);
    }

    public function test_normaliza_codigo_a_mayusculas(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'verano10',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
        ]);

        $this->assertDatabaseHas('codigos_descuento', ['codigo' => 'VERANO10']);
        $this->assertDatabaseMissing('codigos_descuento', ['codigo' => 'verano10']);
    }

    public function test_rechaza_codigo_duplicado_sin_importar_mayusculas(): void
    {
        $admin = User::factory()->create();
        CodigoDescuento::factory()->create(['codigo' => 'VERANO10']);

        $response = $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'verano10',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
        ]);

        $response->assertSessionHasErrors('codigo');
        $this->assertSame(1, CodigoDescuento::where('codigo', 'VERANO10')->count());
    }

    public function test_rechaza_porcentaje_mayor_a_100(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'EXAGERADO',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 150,
        ]);

        $response->assertSessionHasErrors('valor_descuento');
        $this->assertDatabaseMissing('codigos_descuento', ['codigo' => 'EXAGERADO']);
    }

    public function test_permite_valor_fijo_mayor_a_100(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'GRANDE',
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 5000,
        ]);

        $response->assertRedirect(route('codigos-descuento.index'));
        $this->assertDatabaseHas('codigos_descuento', ['codigo' => 'GRANDE']);
    }

    public function test_rechaza_vigente_hasta_anterior_a_vigente_desde(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('codigos-descuento.store'), [
            'codigo' => 'FECHAS',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
            'vigente_desde' => now()->addDays(10)->toDateString(),
            'vigente_hasta' => now()->addDays(5)->toDateString(),
        ]);

        $response->assertSessionHasErrors('vigente_hasta');
        $this->assertDatabaseMissing('codigos_descuento', ['codigo' => 'FECHAS']);
    }

    public function test_admin_puede_editar_codigo_descuento(): void
    {
        $admin = User::factory()->create();
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'VIEJO', 'valor_descuento' => 10]);

        $response = $this->actingAs($admin)->put(route('codigos-descuento.update', $codigo), [
            'codigo' => 'NUEVO',
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 300,
            'activo' => false,
        ]);

        $response->assertRedirect(route('codigos-descuento.index'));
        $codigo->refresh();
        $this->assertSame('NUEVO', $codigo->codigo);
        $this->assertSame('fijo', $codigo->tipo_descuento->value);
        $this->assertFalse($codigo->activo);
    }

    public function test_editar_codigo_no_choca_con_su_propio_codigo(): void
    {
        $admin = User::factory()->create();
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'MISMO']);

        $response = $this->actingAs($admin)->put(route('codigos-descuento.update', $codigo), [
            'codigo' => 'mismo',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 20,
        ]);

        $response->assertRedirect(route('codigos-descuento.index'));
        $this->assertSame('MISMO', $codigo->fresh()->codigo);
    }

    public function test_editar_sin_cambiar_el_codigo_no_da_error_de_duplicado(): void
    {
        $admin = User::factory()->create();
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'FIJO20', 'valor_descuento' => 20]);

        $response = $this->actingAs($admin)->put(route('codigos-descuento.update', $codigo), [
            'codigo' => 'FIJO20',
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 25,
        ]);

        $response->assertSessionDoesntHaveErrors('codigo');
        $response->assertRedirect(route('codigos-descuento.index'));
        $this->assertSame(25.0, (float) $codigo->fresh()->valor_descuento);
    }

    public function test_no_se_puede_eliminar_codigo_ya_usado(): void
    {
        $admin = User::factory()->create();
        $codigo = CodigoDescuento::factory()->create(['usos_actuales' => 3]);

        $response = $this->actingAs($admin)->delete(route('codigos-descuento.destroy', $codigo));

        $response->assertSessionHasErrors('codigo');
        $this->assertDatabaseHas('codigos_descuento', ['id' => $codigo->id]);
    }

    public function test_esta_vigente_false_si_inactivo(): void
    {
        $codigo = CodigoDescuento::factory()->create(['activo' => false]);

        $this->assertFalse($codigo->estaVigente());
    }

    public function test_esta_vigente_false_antes_de_vigente_desde(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'vigente_desde' => now()->addDay()->toDateString(),
        ]);

        $this->assertFalse($codigo->estaVigente());
    }

    public function test_esta_vigente_false_despues_de_vigente_hasta(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'vigente_hasta' => now()->subDay()->toDateString(),
        ]);

        $this->assertFalse($codigo->estaVigente());
    }

    /**
     * Un código con vigente_hasta = hoy debe seguir vigente durante todo el día de
     * hoy, sin importar la hora actual (borde: vigente_hasta se castea a medianoche).
     */
    public function test_esta_vigente_true_cuando_vigente_hasta_es_hoy(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'vigente_hasta' => now()->toDateString(),
        ]);

        $this->assertTrue($codigo->estaVigente());
    }

    /**
     * Simétrico al caso anterior: vigente_desde = hoy no debería requerir esperar
     * hasta mañana para que el código esté vigente.
     */
    public function test_esta_vigente_true_cuando_vigente_desde_es_hoy(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'vigente_desde' => now()->toDateString(),
        ]);

        $this->assertTrue($codigo->estaVigente());
    }

    public function test_esta_vigente_false_si_alcanzo_limite_de_usos(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'limite_usos' => 5,
            'usos_actuales' => 5,
        ]);

        $this->assertFalse($codigo->estaVigente());
    }

    public function test_esta_vigente_true_dentro_de_rango_y_con_usos_disponibles(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'vigente_desde' => now()->subDay()->toDateString(),
            'vigente_hasta' => now()->addDay()->toDateString(),
            'limite_usos' => 5,
            'usos_actuales' => 4,
        ]);

        $this->assertTrue($codigo->estaVigente());
    }

    public function test_esta_vigente_true_cuando_fechas_y_limite_son_null(): void
    {
        $codigo = CodigoDescuento::factory()->create([
            'activo' => true,
            'vigente_desde' => null,
            'vigente_hasta' => null,
            'limite_usos' => null,
            'usos_actuales' => 1000,
        ]);

        $this->assertTrue($codigo->estaVigente());
    }
}
