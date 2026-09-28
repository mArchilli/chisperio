<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComboControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crea_un_combo_con_items_fijos_y_a_eleccion(): void
    {
        $admin = User::factory()->create();
        $productoA = Producto::factory()->create();
        $productoB = Producto::factory()->create();
        $variante = ProductoVariante::create([
            'producto_id' => $productoB->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post(route('combos.store'), [
            'titulo' => 'Combo Fiesta',
            'descripcion' => 'Un combo de prueba',
            'precio' => 5000,
            'is_active' => true,
            'is_featured' => false,
            'descuento_activo' => false,
            'items' => [
                ['producto_id' => $productoA->id, 'cantidad' => 2, 'producto_variante_id' => null],
                ['producto_id' => $productoB->id, 'cantidad' => 1, 'producto_variante_id' => $variante->id],
            ],
        ]);

        $response->assertRedirect(route('combos.index'));

        $combo = Combo::where('titulo', 'Combo Fiesta')->firstOrFail();
        $this->assertSame(5000.0, (float) $combo->precio);
        $this->assertSame(2, $combo->items()->count());

        $this->assertDatabaseHas('combo_productos', [
            'combo_id' => $combo->id, 'producto_id' => $productoA->id, 'cantidad' => 2, 'producto_variante_id' => null,
        ]);
        $this->assertDatabaseHas('combo_productos', [
            'combo_id' => $combo->id, 'producto_id' => $productoB->id, 'cantidad' => 1, 'producto_variante_id' => $variante->id,
        ]);
    }

    public function test_crear_combo_con_envio_gratis_lo_persiste_y_lo_expone_en_la_vidriera(): void
    {
        $admin = User::factory()->create();
        $producto = Producto::factory()->create();

        $response = $this->actingAs($admin)->post(route('combos.store'), [
            'titulo' => 'Combo Con Envío Gratis',
            'precio' => 1000,
            'envio_gratis' => true,
            'items' => [
                ['producto_id' => $producto->id, 'cantidad' => 1, 'producto_variante_id' => null],
            ],
        ]);

        $response->assertRedirect(route('combos.index'));

        $combo = Combo::where('titulo', 'Combo Con Envío Gratis')->firstOrFail();
        $this->assertTrue($combo->envio_gratis);

        $listado = $this->get(route('tienda.index', ['filter' => 'combos']));
        $listado->assertInertia(fn ($page) => $page
            ->where('productos.data.0.envio_gratis', true)
        );

        $ficha = $this->get(route('combos.show', $combo->id));
        $ficha->assertInertia(fn ($page) => $page->where('combo.envio_gratis', true));
    }

    public function test_crear_combo_sin_marcar_envio_gratis_lo_deja_en_false(): void
    {
        $admin = User::factory()->create();
        $producto = Producto::factory()->create();

        $this->actingAs($admin)->post(route('combos.store'), [
            'titulo' => 'Combo Sin Envío Gratis',
            'precio' => 1000,
            'items' => [
                ['producto_id' => $producto->id, 'cantidad' => 1, 'producto_variante_id' => null],
            ],
        ]);

        $combo = Combo::where('titulo', 'Combo Sin Envío Gratis')->firstOrFail();
        $this->assertFalse($combo->envio_gratis);
    }

    public function test_crear_combo_con_descuento_activo_guarda_los_campos_de_descuento(): void
    {
        $admin = User::factory()->create();
        $producto = Producto::factory()->create();

        $response = $this->actingAs($admin)->post(route('combos.store'), [
            'titulo' => 'Combo Con Descuento',
            'precio' => 1000,
            'descuento_activo' => true,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'items' => [
                ['producto_id' => $producto->id, 'cantidad' => 1, 'producto_variante_id' => null],
            ],
        ]);

        $response->assertRedirect(route('combos.index'));

        $combo = Combo::where('titulo', 'Combo Con Descuento')->firstOrFail();
        $this->assertTrue($combo->descuento_activo);
        $this->assertSame('porcentaje', $combo->tipo_descuento->value);
        $this->assertSame(15.0, (float) $combo->valor_descuento);
        $this->assertTrue($combo->descuentoVigente());
    }

    public function test_crear_combo_sin_items_falla_la_validacion(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('combos.store'), [
            'titulo' => 'Combo Vacío',
            'precio' => 1000,
            'items' => [],
        ]);

        $response->assertSessionHasErrors(['items']);
        $this->assertSame(0, Combo::count());
    }

    public function test_variante_que_no_pertenece_al_producto_de_la_linea_rechaza_todo(): void
    {
        $admin = User::factory()->create();
        $productoA = Producto::factory()->create();
        $productoB = Producto::factory()->create();
        $varianteDeB = ProductoVariante::create([
            'producto_id' => $productoB->id, 'nombre' => 'Azul', 'color_hex' => '#0000ff',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post(route('combos.store'), [
            'titulo' => 'Combo Inválido',
            'precio' => 1000,
            'items' => [
                ['producto_id' => $productoA->id, 'cantidad' => 1, 'producto_variante_id' => $varianteDeB->id],
            ],
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors();
        $this->assertSame(0, Combo::count());
    }

    public function test_admin_edita_un_combo_agregando_y_quitando_items(): void
    {
        $admin = User::factory()->create();
        $productoA = Producto::factory()->create();
        $productoB = Producto::factory()->create();

        $combo = Combo::create(['titulo' => 'Combo Editable', 'precio' => 2000, 'is_active' => true]);
        $itemA = ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $productoA->id, 'cantidad' => 1, 'orden' => 0]);

        $response = $this->actingAs($admin)->put(route('combos.update', $combo->id), [
            'titulo' => 'Combo Editable',
            'precio' => 2500,
            'is_active' => true,
            'descuento_activo' => false,
            'items' => [
                ['producto_id' => $productoB->id, 'cantidad' => 3, 'producto_variante_id' => null],
            ],
        ]);

        $response->assertRedirect(route('combos.index'));

        $combo->refresh();
        $this->assertSame(2500.0, (float) $combo->precio);
        $this->assertSame(1, $combo->items()->count());
        $this->assertDatabaseMissing('combo_productos', ['id' => $itemA->id]);
        $this->assertDatabaseHas('combo_productos', ['combo_id' => $combo->id, 'producto_id' => $productoB->id, 'cantidad' => 3]);
    }

    public function test_vendedor_no_puede_acceder_al_crud_de_combos(): void
    {
        $vendedor = User::factory()->vendedor()->create(['sucursal' => 'buenos-aires']);

        $this->actingAs($vendedor)->get(route('combos.index'))->assertForbidden();
        $this->actingAs($vendedor)->get(route('combos.create'))->assertForbidden();
    }

    public function test_no_se_puede_eliminar_un_producto_usado_en_un_combo(): void
    {
        $admin = User::factory()->create();
        $producto = Producto::factory()->create();
        $combo = Combo::create(['titulo' => 'Combo Bloqueante', 'precio' => 1000, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $producto->id, 'cantidad' => 1, 'orden' => 0]);

        $response = $this->actingAs($admin)->delete(route('productos.destroy', $producto->id));

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['producto']);
        $this->assertDatabaseHas('productos', ['id' => $producto->id]);
    }

    public function test_combo_activo_aparece_en_el_filtro_combos_de_la_tienda(): void
    {
        $combo = Combo::create(['titulo' => 'Combo Visible', 'precio' => 1000, 'is_active' => true]);
        $producto = Producto::factory()->create();
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $producto->id, 'cantidad' => 1, 'orden' => 0]);

        $response = $this->get(route('tienda.index', ['filter' => 'combos']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tienda')
            ->where('productos.data.0.titulo', 'Combo Visible')
            ->where('productos.data.0.tipo', 'combo')
        );
    }

    public function test_combo_muestra_su_ficha_publica(): void
    {
        $combo = Combo::create(['titulo' => 'Combo Ficha', 'precio' => 1500, 'is_active' => true]);
        $producto = Producto::factory()->create();
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $producto->id, 'cantidad' => 1, 'orden' => 0]);

        $response = $this->get(route('combos.show', $combo->id));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('ShowCombo')
            ->where('combo.titulo', 'Combo Ficha')
        );
    }
}
