<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForbiddenPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendedor_en_ruta_solo_admin_recibe_la_pagina_de_error_403(): void
    {
        $vendedor = User::factory()->vendedor()->create();

        $response = $this->actingAs($vendedor)->get(route('productos.index'));

        $response->assertForbidden();
        $response->assertInertia(fn ($page) => $page
            ->component('Error')
            ->where('status', 403)
        );
    }

    public function test_admin_no_ve_la_pagina_de_error_en_una_ruta_permitida(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->get(route('productos.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Admin/Productos/Index'));
    }

    public function test_guard_de_sucursal_expone_su_mensaje_en_la_pagina_de_error(): void
    {
        $vendedor = User::factory()->vendedor()->create(['sucursal' => \App\Enums\Sucursal::Cordoba]);

        $pedido = \App\Models\Pedido::create([
            'cliente_nombre' => 'Cliente BsAs',
            'subtotal' => 1000,
            'total' => 1000,
            'estado' => \App\Enums\EstadoPedido::Pendiente,
            'sucursal' => \App\Enums\Sucursal::BuenosAires,
        ]);

        $response = $this->actingAs($vendedor)->get(route('pedidos.show', $pedido));

        $response->assertForbidden();
        $response->assertInertia(fn ($page) => $page
            ->component('Error')
            ->where('status', 403)
            ->where('message', 'Este pedido pertenece a otra sucursal.')
        );
    }

    public function test_404_usa_la_pagina_notfound_con_diseno_del_sitio(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->get('/admin/pedidos/999999');

        $response->assertNotFound();
        $response->assertInertia(fn ($page) => $page->component('NotFound'));
    }

    public function test_404_en_ruta_totalmente_inexistente(): void
    {
        $response = $this->get('/esto-no-existe-para-nada');

        $response->assertNotFound();
        $response->assertInertia(fn ($page) => $page->component('NotFound'));
    }
}
