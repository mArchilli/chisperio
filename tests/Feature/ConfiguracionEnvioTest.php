<?php

namespace Tests\Feature;

use App\Models\ConfiguracionEnvio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfiguracionEnvioTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendedor_no_puede_ver_ni_editar_la_configuracion(): void
    {
        $vendedor = User::factory()->vendedor()->create();

        $this->actingAs($vendedor)->get(route('configuracion-envio.edit'))->assertForbidden();
        $this->actingAs($vendedor)->patch(route('configuracion-envio.update'), ['monto_minimo' => 1000])->assertForbidden();
    }

    public function test_admin_puede_ver_y_actualizar_la_configuracion(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->get(route('configuracion-envio.edit'))->assertOk();

        $response = $this->actingAs($admin)->patch(route('configuracion-envio.update'), [
            'monto_minimo' => 25000,
        ]);

        $response->assertRedirect(route('configuracion-envio.edit'));
        $this->assertDatabaseHas('configuracion_envio', ['id' => 1, 'monto_minimo' => 25000]);
    }

    public function test_obtener_crea_una_fila_por_defecto_si_no_existe_ninguna(): void
    {
        $this->assertDatabaseCount('configuracion_envio', 0);

        $configuracion = ConfiguracionEnvio::obtener();

        $this->assertSame(1, $configuracion->id);
        $this->assertEquals(0, $configuracion->monto_minimo);
        $this->assertDatabaseCount('configuracion_envio', 1);
    }

    public function test_el_monto_minimo_se_comparte_globalmente_via_inertia(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 30000]);
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->get(route('dashboard'));

        $response->assertInertia(fn ($page) => $page->where('configuracionEnvio.montoMinimo', 30000));
    }
}
