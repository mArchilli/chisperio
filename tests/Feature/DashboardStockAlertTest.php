<?php

namespace Tests\Feature;

use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardStockAlertTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_reporta_la_cantidad_de_productos_sin_stock(): void
    {
        $user = User::factory()->create();

        Producto::factory()->create(['stock' => 0]);
        Producto::factory()->create(['stock' => 0]);
        Producto::factory()->create(['stock' => 5]);
        Producto::factory()->create(['stock' => null]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('stats.productos_sin_stock_count', 2)
        );
    }

    public function test_dashboard_reporta_cero_si_ningun_producto_esta_sin_stock(): void
    {
        $user = User::factory()->create();

        Producto::factory()->create(['stock' => 5]);
        Producto::factory()->create(['stock' => null]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('stats.productos_sin_stock_count', 0)
        );
    }
}
