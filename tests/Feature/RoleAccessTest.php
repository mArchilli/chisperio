<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Oferta;
use App\Models\Producto;
use App\Models\Subcategoria;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendedor_no_puede_eliminar_producto(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $producto = Producto::factory()->create();

        $response = $this->actingAs($vendedor)->delete(route('productos.destroy', $producto));

        $response->assertForbidden();
        $this->assertDatabaseHas('productos', ['id' => $producto->id]);
    }

    public function test_admin_puede_eliminar_producto(): void
    {
        $admin = User::factory()->create();
        $producto = Producto::factory()->create();

        $response = $this->actingAs($admin)->delete(route('productos.destroy', $producto));

        $response->assertRedirect(route('productos.index'));
        $this->assertDatabaseMissing('productos', ['id' => $producto->id]);
    }

    public function test_vendedor_no_puede_eliminar_categoria(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $categoria = Categoria::create(['nombre' => 'Categoria Test']);

        $response = $this->actingAs($vendedor)->delete(route('categorias.destroy', $categoria));

        $response->assertForbidden();
        $this->assertDatabaseHas('categorias', ['id' => $categoria->id]);
    }

    public function test_admin_puede_eliminar_categoria(): void
    {
        $admin = User::factory()->create();
        $categoria = Categoria::create(['nombre' => 'Categoria Test']);

        $response = $this->actingAs($admin)->delete(route('categorias.destroy', $categoria));

        $response->assertRedirect(route('categorias.index'));
        $this->assertDatabaseMissing('categorias', ['id' => $categoria->id]);
    }

    public function test_vendedor_no_puede_eliminar_subcategoria(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $categoria = Categoria::create(['nombre' => 'Categoria Test']);
        $subcategoria = Subcategoria::create(['nombre' => 'Subcategoria Test', 'categoria_id' => $categoria->id]);

        $response = $this->actingAs($vendedor)->delete(route('subcategorias.destroy', $subcategoria));

        $response->assertForbidden();
        $this->assertDatabaseHas('subcategorias', ['id' => $subcategoria->id]);
    }

    public function test_admin_puede_eliminar_subcategoria(): void
    {
        $admin = User::factory()->create();
        $categoria = Categoria::create(['nombre' => 'Categoria Test']);
        $subcategoria = Subcategoria::create(['nombre' => 'Subcategoria Test', 'categoria_id' => $categoria->id]);

        $response = $this->actingAs($admin)->delete(route('subcategorias.destroy', $subcategoria));

        $response->assertRedirect(route('subcategorias.index', ['categoria_id' => $categoria->id]));
        $this->assertDatabaseMissing('subcategorias', ['id' => $subcategoria->id]);
    }

    public function test_vendedor_no_puede_eliminar_oferta(): void
    {
        $vendedor = User::factory()->vendedor()->create();
        $oferta = Oferta::factory()->create();

        $response = $this->actingAs($vendedor)->delete(route('ofertas.destroy', $oferta));

        $response->assertForbidden();
        $this->assertDatabaseHas('ofertas', ['id' => $oferta->id]);
    }

    public function test_admin_puede_eliminar_oferta(): void
    {
        $admin = User::factory()->create();
        $oferta = Oferta::factory()->create();

        $response = $this->actingAs($admin)->delete(route('ofertas.destroy', $oferta));

        $response->assertRedirect(route('ofertas.index'));
        $this->assertDatabaseMissing('ofertas', ['id' => $oferta->id]);
    }

    public function test_vendedor_no_puede_ver_metricas(): void
    {
        $vendedor = User::factory()->vendedor()->create();

        $response = $this->actingAs($vendedor)->get(route('metricas.index'));

        $response->assertForbidden();
    }

    public function test_admin_puede_ver_metricas(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->get(route('metricas.index'));

        $response->assertOk();
    }
}
