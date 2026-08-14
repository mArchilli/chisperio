<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfertaDescuentoTest extends TestCase
{
    use RefreshDatabase;

    public function test_crea_oferta_alcance_todos_porcentaje(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
            'fecha_inicio' => null,
            'fecha_fin' => null,
            'is_active' => true,
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $this->assertDatabaseHas('ofertas', [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
        ]);
    }

    public function test_crea_oferta_alcance_especifico_apuntando_a_una_escala(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 100,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => $escala->id,
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $this->assertDatabaseHas('ofertas', [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 100,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => $escala->id,
        ]);
    }

    public function test_crea_oferta_alcance_especifico_apuntando_al_precio_base(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => null,
        ]);

        $response->assertRedirect(route('ofertas.index'));

        $oferta = Oferta::where('producto_id', $producto->id)->firstOrFail();
        $this->assertSame(AlcanceOferta::Especifico, $oferta->alcance);
        $this->assertNull($oferta->producto_escala_precio_id);
    }

    public function test_editar_oferta_cambia_alcance_y_escala(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create(['producto_id' => $producto->id, 'cantidad_minima' => 10]);
        $oferta = Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'producto_escala_precio_id' => null,
        ]);

        $response = $this->actingAs($user)->put(route('ofertas.update', $oferta), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 12,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => $escala->id,
            'is_active' => true,
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $oferta->refresh();
        $this->assertSame(AlcanceOferta::Especifico, $oferta->alcance);
        $this->assertSame($escala->id, $oferta->producto_escala_precio_id);
    }

    public function test_rechaza_escala_de_otro_producto(): void
    {
        $user = User::factory()->create();
        $productoA = Producto::factory()->create(['precio' => 1000]);
        $productoB = Producto::factory()->create(['precio' => 2000]);
        $escalaDeB = EscalaPrecio::factory()->create(['producto_id' => $productoB->id]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $productoA->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 10,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => $escalaDeB->id,
        ]);

        $response->assertSessionHasErrors(['producto_escala_precio_id']);
        $this->assertDatabaseMissing('ofertas', ['producto_id' => $productoA->id]);
    }

    public function test_rechaza_segunda_oferta_alcance_todos_superpuesta(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 20,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
        ]);

        $response->assertSessionHasErrors(['alcance']);
        $this->assertSame(1, Oferta::where('producto_id', $producto->id)->count());
    }

    public function test_permite_oferta_especifica_en_nivel_distinto_del_mismo_producto(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escalaA = EscalaPrecio::factory()->create(['producto_id' => $producto->id, 'cantidad_minima' => 10]);
        $escalaB = EscalaPrecio::factory()->create(['producto_id' => $producto->id, 'cantidad_minima' => 20]);

        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escalaA->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => $escalaB->id,
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $this->assertSame(2, Oferta::where('producto_id', $producto->id)->count());
    }

    public function test_rechaza_oferta_especifica_cuando_ya_hay_alcance_todos_vigente(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create(['producto_id' => $producto->id]);

        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'alcance' => 'especifico',
            'producto_escala_precio_id' => $escala->id,
        ]);

        $response->assertSessionHasErrors(['alcance']);
        $this->assertSame(1, Oferta::where('producto_id', $producto->id)->count());
    }

    public function test_rechaza_oferta_alcance_todos_cuando_ya_hay_especifico_vigente(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $escala = EscalaPrecio::factory()->create(['producto_id' => $producto->id]);

        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Especifico,
            'producto_escala_precio_id' => $escala->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
        ]);

        $response->assertSessionHasErrors(['alcance']);
        $this->assertSame(1, Oferta::where('producto_id', $producto->id)->count());
    }

    public function test_permite_oferta_con_fechas_no_superpuestas(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);

        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'is_active' => true,
            'fecha_inicio' => now()->subMonths(2),
            'fecha_fin' => now()->subMonth(),
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
            'fecha_inicio' => now()->addDay()->toDateTimeString(),
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $this->assertSame(2, Oferta::where('producto_id', $producto->id)->count());
    }

    public function test_permite_oferta_superpuesta_si_la_existente_esta_inactiva(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);

        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'is_active' => false,
        ]);

        $response = $this->actingAs($user)->post(route('ofertas.store'), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'porcentaje',
            'valor_descuento' => 15,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $this->assertSame(2, Oferta::where('producto_id', $producto->id)->count());
    }

    public function test_editar_oferta_no_choca_consigo_misma(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000]);
        $oferta = Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->put(route('ofertas.update', $oferta), [
            'producto_id' => $producto->id,
            'tipo_descuento' => 'fijo',
            'valor_descuento' => 200,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
            'is_active' => true,
        ]);

        $response->assertRedirect(route('ofertas.index'));
        $oferta->refresh();
        $this->assertSame('fijo', $oferta->tipo_descuento->value);
        $this->assertSame(200.0, (float) $oferta->valor_descuento);
    }
}
