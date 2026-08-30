<?php

namespace Tests\Feature;

use App\Enums\RolUsuario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsuarioManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendedor_no_puede_acceder_a_ninguna_ruta_de_usuarios(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $otro = User::factory()->create();

        $this->actingAs($vendedor)->get(route('usuarios.index'))->assertForbidden();
        $this->actingAs($vendedor)->get(route('usuarios.create'))->assertForbidden();
        $this->actingAs($vendedor)->post(route('usuarios.store'), [])->assertForbidden();
        $this->actingAs($vendedor)->get(route('usuarios.edit', $otro))->assertForbidden();
        $this->actingAs($vendedor)->put(route('usuarios.update', $otro), [])->assertForbidden();
        $this->actingAs($vendedor)->delete(route('usuarios.destroy', $otro))->assertForbidden();
    }

    public function test_admin_puede_listar_usuarios(): void
    {
        $admin = User::factory()->create();
        User::factory()->vendedor()->create(['name' => 'Juan Vendedor']);

        $response = $this->actingAs($admin)->get(route('usuarios.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Admin/Usuarios/Index')->has('usuarios', 2));
    }

    public function test_admin_puede_crear_un_vendedor(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('usuarios.store'), [
            'name' => 'Nuevo Vendedor',
            'email' => 'vendedor@chisperio.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'vendedor',
            'sucursal' => 'cordoba',
        ]);

        $response->assertRedirect(route('usuarios.index'));
        $this->assertDatabaseHas('users', [
            'email' => 'vendedor@chisperio.com',
            'role' => RolUsuario::Vendedor->value,
            'sucursal' => 'cordoba',
        ]);
    }

    public function test_crear_vendedor_sin_sucursal_falla(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('usuarios.store'), [
            'name' => 'Vendedor Sin Sucursal',
            'email' => 'sinsucursal@chisperio.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'vendedor',
        ]);

        $response->assertSessionHasErrors('sucursal');
        $this->assertDatabaseMissing('users', ['email' => 'sinsucursal@chisperio.com']);
    }

    public function test_crear_admin_ignora_la_sucursal_enviada(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('usuarios.store'), [
            'name' => 'Otro Admin',
            'email' => 'otroadmin@chisperio.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
            'sucursal' => 'cordoba',
        ]);

        $response->assertRedirect(route('usuarios.index'));
        $this->assertDatabaseHas('users', [
            'email' => 'otroadmin@chisperio.com',
            'role' => RolUsuario::Admin->value,
            'sucursal' => null,
        ]);
    }

    public function test_crear_admin_acepta_sucursal_vacia_del_form(): void
    {
        // El form manda `sucursal: ''` para el campo oculto cuando el rol es admin.
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('usuarios.store'), [
            'name' => 'Admin Form',
            'email' => 'adminform@chisperio.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
            'sucursal' => '',
        ]);

        $response->assertRedirect(route('usuarios.index'));
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', ['email' => 'adminform@chisperio.com', 'sucursal' => null]);
    }

    public function test_admin_puede_editar_nombre_y_rol_de_un_usuario(): void
    {
        $admin = User::factory()->create();
        $vendedor = User::factory()->vendedor()->create();

        $response = $this->actingAs($admin)->put(route('usuarios.update', $vendedor), [
            'name' => 'Nombre Actualizado',
            'email' => $vendedor->email,
            'role' => 'admin',
        ]);

        $response->assertRedirect(route('usuarios.index'));
        $this->assertDatabaseHas('users', ['id' => $vendedor->id, 'name' => 'Nombre Actualizado', 'role' => RolUsuario::Admin->value]);
    }

    public function test_no_se_puede_degradar_al_unico_admin(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->put(route('usuarios.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'vendedor',
            'sucursal' => 'buenos-aires',
        ]);

        $response->assertSessionHasErrors('role');
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => RolUsuario::Admin->value]);
    }

    public function test_degradar_a_admin_es_valido_si_hay_otro_admin(): void
    {
        $admin = User::factory()->create();
        $otroAdmin = User::factory()->create();

        $response = $this->actingAs($admin)->put(route('usuarios.update', $otroAdmin), [
            'name' => $otroAdmin->name,
            'email' => $otroAdmin->email,
            'role' => 'vendedor',
            'sucursal' => 'buenos-aires',
        ]);

        $response->assertRedirect(route('usuarios.index'));
        $this->assertDatabaseHas('users', [
            'id' => $otroAdmin->id,
            'role' => RolUsuario::Vendedor->value,
            'sucursal' => 'buenos-aires',
        ]);
    }

    public function test_admin_puede_eliminar_un_vendedor(): void
    {
        $admin = User::factory()->create();
        $vendedor = User::factory()->vendedor()->create();

        $response = $this->actingAs($admin)->delete(route('usuarios.destroy', $vendedor));

        $response->assertRedirect(route('usuarios.index'));
        $this->assertDatabaseMissing('users', ['id' => $vendedor->id]);
    }

    public function test_no_se_puede_eliminar_al_unico_admin(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->delete(route('usuarios.destroy', $admin));

        $response->assertRedirect();
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_no_se_puede_eliminar_la_propia_cuenta_aunque_haya_otro_admin(): void
    {
        $admin = User::factory()->create();
        User::factory()->create();

        $response = $this->actingAs($admin)->delete(route('usuarios.destroy', $admin));

        $response->assertRedirect();
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }
}
