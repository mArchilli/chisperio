<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ConfigurarPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_un_vendedor_creado_por_el_admin_arranca_con_cambio_de_clave_pendiente(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->post(route('usuarios.store'), [
            'name' => 'Vendedor Nuevo',
            'email' => 'nuevo@chisperio.com',
            'password' => 'clave-temporal',
            'password_confirmation' => 'clave-temporal',
            'role' => 'vendedor',
            'sucursal' => 'cordoba',
        ]);

        $this->assertTrue(User::where('email', 'nuevo@chisperio.com')->first()->debe_cambiar_password);
    }

    public function test_un_admin_creado_por_el_admin_no_tiene_cambio_de_clave_pendiente(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->post(route('usuarios.store'), [
            'name' => 'Otro Admin',
            'email' => 'otroadmin@chisperio.com',
            'password' => 'clave-temporal',
            'password_confirmation' => 'clave-temporal',
            'role' => 'admin',
            'sucursal' => '',
        ]);

        $this->assertFalse(User::where('email', 'otroadmin@chisperio.com')->first()->debe_cambiar_password);
    }

    public function test_con_cambio_pendiente_cualquier_ruta_redirige_a_configurar_la_clave(): void
    {
        $vendedor = User::factory()->vendedor()->create(['debe_cambiar_password' => true]);

        $this->actingAs($vendedor)->get(route('dashboard'))->assertRedirect(route('password.configurar'));
        $this->actingAs($vendedor)->get(route('pedidos.index'))->assertRedirect(route('password.configurar'));
        $this->actingAs($vendedor)->get('/tienda')->assertRedirect(route('password.configurar'));
    }

    public function test_con_cambio_pendiente_se_puede_ver_el_formulario_y_cerrar_sesion(): void
    {
        $vendedor = User::factory()->vendedor()->create(['debe_cambiar_password' => true]);

        $this->actingAs($vendedor)->get(route('password.configurar'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Auth/ConfigurarPassword'));

        $this->actingAs($vendedor)->post(route('logout'))->assertRedirect('/');
    }

    public function test_configurar_una_clave_nueva_limpia_el_pendiente_y_actualiza_el_hash(): void
    {
        $vendedor = User::factory()->vendedor()->create([
            'password' => Hash::make('clave-temporal'),
            'debe_cambiar_password' => true,
        ]);

        $response = $this->actingAs($vendedor)->put(route('password.configurar.update'), [
            'password' => 'mi-clave-privada',
            'password_confirmation' => 'mi-clave-privada',
        ]);

        $response->assertRedirect(route('dashboard'));

        $vendedor->refresh();
        $this->assertFalse($vendedor->debe_cambiar_password);
        $this->assertTrue(Hash::check('mi-clave-privada', $vendedor->password));
    }

    public function test_no_se_puede_reusar_la_clave_temporal(): void
    {
        $vendedor = User::factory()->vendedor()->create([
            'password' => Hash::make('clave-temporal'),
            'debe_cambiar_password' => true,
        ]);

        $response = $this->actingAs($vendedor)
            ->from(route('password.configurar'))
            ->put(route('password.configurar.update'), [
                'password' => 'clave-temporal',
                'password_confirmation' => 'clave-temporal',
            ]);

        $response->assertRedirect(route('password.configurar'));
        $response->assertSessionHasErrors('password');
        $this->assertTrue($vendedor->fresh()->debe_cambiar_password);
    }

    public function test_la_clave_nueva_respeta_el_minimo_de_longitud(): void
    {
        $vendedor = User::factory()->vendedor()->create(['debe_cambiar_password' => true]);

        $response = $this->actingAs($vendedor)
            ->from(route('password.configurar'))
            ->put(route('password.configurar.update'), [
                'password' => 'corta',
                'password_confirmation' => 'corta',
            ]);

        $response->assertSessionHasErrors('password');
        $this->assertTrue($vendedor->fresh()->debe_cambiar_password);
    }

    public function test_sin_cambio_pendiente_el_formulario_redirige_al_dashboard(): void
    {
        $vendedor = User::factory()->vendedor()->create(['debe_cambiar_password' => false]);

        $this->actingAs($vendedor)->get(route('password.configurar'))->assertRedirect(route('dashboard'));
    }

    public function test_un_usuario_sin_la_marca_navega_sin_restriccion(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->get(route('dashboard'))->assertOk();
    }
}
