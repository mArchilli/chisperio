<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class UserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_crea_el_admin_con_el_email_y_la_contrasena_del_env(): void
    {
        config(['seeders.admin_email' => 'duenio@chisperio.test', 'seeders.admin_password' => 'una-clave-larga-123']);

        $this->seed(UserSeeder::class);

        $admin = User::where('email', 'duenio@chisperio.test')->firstOrFail();
        $this->assertSame('admin', $admin->role->value ?? $admin->role);
        $this->assertTrue(Hash::check('una-clave-larga-123', $admin->password));
        $this->assertDatabaseMissing('users', ['email' => 'admin@admin']);
    }

    public function test_sin_contrasena_genera_una_aleatoria_y_la_muestra_una_vez(): void
    {
        config(['seeders.admin_email' => 'duenio@chisperio.test', 'seeders.admin_password' => null]);

        $this->artisan('db:seed', ['--class' => UserSeeder::class])
            ->expectsOutputToContain('contraseña generada')
            ->assertSuccessful();

        $admin = User::where('email', 'duenio@chisperio.test')->firstOrFail();
        $this->assertFalse(Hash::check('1234', $admin->password));
    }

    public function test_sin_email_configurado_no_crea_nada(): void
    {
        config(['seeders.admin_email' => null]);

        $this->expectException(RuntimeException::class);

        try {
            $this->seed(UserSeeder::class);
        } finally {
            $this->assertSame(0, User::count());
        }
    }

    public function test_no_modifica_un_usuario_existente(): void
    {
        $existente = User::factory()->create(['email' => 'duenio@chisperio.test', 'name' => 'Original', 'password' => Hash::make('la-de-siempre')]);
        config(['seeders.admin_email' => 'duenio@chisperio.test', 'seeders.admin_password' => 'otra-distinta-456']);

        $this->seed(UserSeeder::class);

        $existente->refresh();
        $this->assertSame('Original', $existente->name);
        $this->assertTrue(Hash::check('la-de-siempre', $existente->password));
        $this->assertSame(1, User::count());
    }

    public function test_nunca_corre_en_produccion(): void
    {
        config(['seeders.admin_email' => 'duenio@chisperio.test']);
        $this->app['env'] = 'production';

        foreach ([UserSeeder::class, DatabaseSeeder::class] as $seeder) {
            try {
                (new $seeder)->run();
                $this->fail("{$seeder} corrió en producción.");
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('producción', $e->getMessage());
            }
        }

        $this->assertSame(0, User::count());
    }
}
