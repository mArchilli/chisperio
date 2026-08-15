<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductoEscalasPrecioTest extends TestCase
{
    use RefreshDatabase;

    public function test_crea_producto_con_escalas_de_precio_via_endpoint(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Con Escalas',
            'precio' => 1000,
            'escalas_precio' => [
                ['cantidad_minima' => 5, 'precio_unitario' => 900],
                ['cantidad_minima' => 10, 'precio_unitario' => 800],
                ['cantidad_minima' => 20, 'precio_unitario' => 700],
            ],
        ]);

        $response->assertRedirect(route('productos.index'));

        $producto = Producto::where('titulo', 'Producto Con Escalas')->firstOrFail();
        $this->assertSame(3, $producto->escalasPrecio()->count());
        $this->assertDatabaseHas('producto_escalas_precio', [
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 900,
        ]);
        $this->assertDatabaseHas('producto_escalas_precio', [
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        $this->assertDatabaseHas('producto_escalas_precio', [
            'producto_id' => $producto->id,
            'cantidad_minima' => 20,
            'precio_unitario' => 700,
        ]);
    }

    public function test_crear_producto_sin_escalas_no_requiere_ninguna(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Sin Escalas',
            'precio' => 500,
        ]);

        $response->assertRedirect(route('productos.index'));

        $producto = Producto::where('titulo', 'Producto Sin Escalas')->firstOrFail();
        $this->assertSame(0, $producto->escalasPrecio()->count());
    }

    public function test_editar_producto_agrega_borra_y_modifica_escalas_en_el_mismo_submit(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);

        $aEliminar = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 900,
        ]);
        $aModificar = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        $sinCambios = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 20,
            'precio_unitario' => 700,
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [
                ['id' => $aModificar->id, 'cantidad_minima' => 10, 'precio_unitario' => 750],
                ['id' => $sinCambios->id, 'cantidad_minima' => 20, 'precio_unitario' => 700],
                ['cantidad_minima' => 50, 'precio_unitario' => 600],
            ],
        ]);

        $response->assertRedirect(route('productos.index'));

        $this->assertSame(3, $producto->escalasPrecio()->count());
        $this->assertModelMissing($aEliminar);
        $this->assertDatabaseHas('producto_escalas_precio', [
            'id' => $aModificar->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 750,
        ]);
        $this->assertDatabaseHas('producto_escalas_precio', [
            'id' => $sinCambios->id,
            'cantidad_minima' => 20,
            'precio_unitario' => 700,
        ]);
        $this->assertDatabaseHas('producto_escalas_precio', [
            'producto_id' => $producto->id,
            'cantidad_minima' => 50,
            'precio_unitario' => 600,
        ]);
    }

    public function test_editar_producto_enviando_escalas_vacias_elimina_las_existentes(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create(['producto_id' => $producto->id]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertSame(0, $producto->escalasPrecio()->count());
    }

    public function test_rechaza_cantidad_minima_duplicada_dentro_del_mismo_producto(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Cantidad Duplicada',
            'precio' => 1000,
            'escalas_precio' => [
                ['cantidad_minima' => 5, 'precio_unitario' => 900],
                ['cantidad_minima' => 5, 'precio_unitario' => 800],
            ],
        ]);

        $response->assertSessionHasErrors(['escalas_precio.1.cantidad_minima']);
        $this->assertDatabaseMissing('productos', ['titulo' => 'Producto Cantidad Duplicada']);
    }

    public function test_rechaza_precio_unitario_negativo(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Precio Invalido',
            'precio' => 1000,
            'escalas_precio' => [
                ['cantidad_minima' => 5, 'precio_unitario' => -100],
            ],
        ]);

        $response->assertSessionHasErrors(['escalas_precio.0.precio_unitario']);
        $this->assertDatabaseMissing('productos', ['titulo' => 'Producto Precio Invalido']);
    }

    public function test_rechaza_cantidad_minima_menor_o_igual_a_uno(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('productos.store'), [
            'titulo' => 'Producto Cantidad Invalida',
            'precio' => 1000,
            'escalas_precio' => [
                ['cantidad_minima' => 1, 'precio_unitario' => 900],
            ],
        ]);

        $response->assertSessionHasErrors(['escalas_precio.0.cantidad_minima']);
        $this->assertDatabaseMissing('productos', ['titulo' => 'Producto Cantidad Invalida']);
    }

    public function test_borra_escala_sin_ofertas_dependientes_normalmente(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertModelMissing($escala);
    }

    public function test_rechaza_borrado_de_escala_con_oferta_especifica_vigente(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 900,
        ]);
        $oferta = Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escala->id,
            'is_active' => true,
            'fecha_fin' => null,
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertSessionHasErrors(["escalas_precio_bloqueadas.{$escala->id}"]);
        $this->assertModelExists($escala);
        $this->assertModelExists($oferta);
    }

    public function test_rechaza_borrado_de_escala_con_oferta_especifica_futura(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escala->id,
            'is_active' => true,
            'fecha_inicio' => now()->addWeek(),
            'fecha_fin' => now()->addMonth(),
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertSessionHasErrors(["escalas_precio_bloqueadas.{$escala->id}"]);
        $this->assertModelExists($escala);
    }

    public function test_permite_borrado_de_escala_con_oferta_especifica_ya_vencida(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
        ]);
        $ofertaVencida = Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escala->id,
            'is_active' => true,
            'fecha_fin' => now()->subDay(),
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertRedirect(route('productos.index'));
        $response->assertSessionHasNoErrors();
        $this->assertModelMissing($escala);
        // La oferta sigue existiendo pero ahora apunta a null (nullOnDelete) — ya estaba
        // vencida, así que no vuelve a resolverla ni PricingService ni ofertaVigente().
        $this->assertDatabaseHas('ofertas', [
            'id' => $ofertaVencida->id,
            'producto_escala_precio_id' => null,
        ]);
    }

    public function test_permite_borrado_de_escala_con_oferta_especifica_inactiva(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escala->id,
            'is_active' => false,
            'fecha_fin' => null,
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertModelMissing($escala);
    }

    public function test_permite_borrado_de_escala_con_oferta_alcance_todos_apuntando_a_otra_escala(): void
    {
        // alcance='todos' nunca setea producto_escala_precio_id (ver ofertaReglas: solo
        // 'present' cuando alcance=especifico), así que nunca puede bloquear un borrado.
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'producto_escala_precio_id' => null,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->put(route('productos.update', $producto), [
            'titulo' => $producto->titulo,
            'precio' => $producto->precio,
            'escalas_precio' => [],
        ]);

        $response->assertRedirect(route('productos.index'));
        $this->assertModelMissing($escala);
    }
}
