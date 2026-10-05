<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\EscalaPrecio;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AumentoPreciosTest extends TestCase
{
    use RefreshDatabase;

    private function escala(Producto $producto, int $minima, float $precio): EscalaPrecio
    {
        return EscalaPrecio::create([
            'producto_id' => $producto->id,
            'cantidad_minima' => $minima,
            'precio_unitario' => $precio,
        ]);
    }

    private function aumentar(array $datos, ?User $usuario = null)
    {
        return $this->actingAs($usuario ?? User::factory()->create())
            ->post(route('productos.aumento-precios'), $datos);
    }

    public function test_aumento_porcentual_actualiza_precio_base_y_escalas_solo_de_los_elegidos(): void
    {
        $elegido = Producto::factory()->create(['precio' => 1000]);
        $escala = $this->escala($elegido, 10, 800);
        $otro = Producto::factory()->create(['precio' => 1000]);
        $escalaOtro = $this->escala($otro, 10, 800);

        $this->aumentar(['producto_ids' => [$elegido->id], 'tipo' => 'porcentaje', 'valor' => 10])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Se actualizó el precio de 1 producto.');

        $this->assertSame(1100.0, (float) $elegido->fresh()->precio);
        $this->assertSame(880.0, (float) $escala->fresh()->precio_unitario);
        $this->assertSame(1000.0, (float) $otro->fresh()->precio);
        $this->assertSame(800.0, (float) $escalaOtro->fresh()->precio_unitario);
    }

    public function test_aumento_fijo_suma_el_monto_a_cada_precio(): void
    {
        $a = Producto::factory()->create(['precio' => 1000]);
        $b = Producto::factory()->create(['precio' => 2500.5]);
        $escala = $this->escala($a, 5, 900);

        $this->aumentar(['producto_ids' => [$a->id, $b->id], 'tipo' => 'fijo', 'valor' => 150.25])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Se actualizaron los precios de 2 productos.');

        $this->assertSame(1150.25, (float) $a->fresh()->precio);
        $this->assertSame(2650.75, (float) $b->fresh()->precio);
        $this->assertSame(1050.25, (float) $escala->fresh()->precio_unitario);
    }

    public function test_el_aumento_redondea_a_dos_decimales(): void
    {
        $producto = Producto::factory()->create(['precio' => 333.33]);

        $this->aumentar(['producto_ids' => [$producto->id], 'tipo' => 'porcentaje', 'valor' => 7.5])
            ->assertSessionHasNoErrors();

        $this->assertSame(358.33, (float) $producto->fresh()->precio); // 333.33 * 1.075 = 358.32975
    }

    public function test_no_toca_el_recargo_de_las_variantes(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 200, 'stock' => 5, 'is_active' => true,
        ]);

        $this->aumentar(['producto_ids' => [$producto->id], 'tipo' => 'porcentaje', 'valor' => 50])
            ->assertSessionHasNoErrors();

        $this->assertSame(1500.0, (float) $producto->fresh()->precio);
        $this->assertSame(200.0, (float) $variante->fresh()->precio_adicional);
    }

    public function test_un_vendedor_no_puede_aumentar_precios(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $this->aumentar(
            ['producto_ids' => [$producto->id], 'tipo' => 'porcentaje', 'valor' => 10],
            User::factory()->vendedor()->create()
        )->assertForbidden();

        $this->assertSame(1000.0, (float) $producto->fresh()->precio);
    }

    public function test_validaciones(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);

        $this->aumentar(['producto_ids' => [], 'tipo' => 'porcentaje', 'valor' => 10])->assertSessionHasErrors('producto_ids');
        $this->aumentar(['producto_ids' => [9999], 'tipo' => 'porcentaje', 'valor' => 10])->assertSessionHasErrors('producto_ids.0');
        $this->aumentar(['producto_ids' => [$producto->id], 'tipo' => 'otro', 'valor' => 10])->assertSessionHasErrors('tipo');
        $this->aumentar(['producto_ids' => [$producto->id], 'tipo' => 'fijo', 'valor' => 0])->assertSessionHasErrors('valor');
        $this->aumentar(['producto_ids' => [$producto->id], 'tipo' => 'fijo', 'valor' => -50])->assertSessionHasErrors('valor');
        $this->aumentar(['producto_ids' => [$producto->id], 'tipo' => 'porcentaje', 'valor' => 1001])->assertSessionHasErrors('valor');

        $this->assertSame(1000.0, (float) $producto->fresh()->precio);
    }

    public function test_si_algun_precio_no_entra_no_se_actualiza_ninguno(): void
    {
        $normal = Producto::factory()->create(['precio' => 1000, 'titulo' => 'Normal']);
        $enorme = Producto::factory()->create(['precio' => 99999999, 'titulo' => 'Enorme']);

        $this->aumentar(['producto_ids' => [$normal->id, $enorme->id], 'tipo' => 'fijo', 'valor' => 500])
            ->assertSessionHasErrors('valor');

        $this->assertSame(1000.0, (float) $normal->fresh()->precio);
        $this->assertSame(99999999.0, (float) $enorme->fresh()->precio);
    }

    public function test_el_listado_manda_las_categorias_con_subcategorias_para_los_filtros(): void
    {
        Categoria::create(['nombre' => 'Bengalas']);

        $this->actingAs(User::factory()->create())
            ->get(route('productos.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Productos/Index')
                ->has('categorias', 1)
                ->has('categorias.0.subcategorias'));
    }
}
