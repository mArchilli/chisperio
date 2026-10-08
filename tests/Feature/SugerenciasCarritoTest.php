<?php

namespace Tests\Feature;

use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SugerenciasCarritoTest extends TestCase
{
    use RefreshDatabase;

    private function producto(string $titulo, array $extra = []): Producto
    {
        return Producto::create(array_merge([
            'titulo' => $titulo,
            'precio' => 1000,
            'is_active' => true,
        ], $extra));
    }

    private function sugeridos(array $productosEnCarrito): array
    {
        return $this->getJson(route('carrito.sugerencias', ['productos' => $productosEnCarrito]))
            ->assertOk()
            ->json('productos.*.titulo');
    }

    public function test_sugiere_lo_compatible_con_lo_que_hay_en_el_carrito(): void
    {
        $pistola = $this->producto('Pistola PULY');
        $chispaPuly = $this->producto('Chispa Fria PULY');
        $this->producto('Pote de humo');

        $pistola->sincronizarCompatibles([$chispaPuly->id]);

        $this->assertSame(['Chispa Fria PULY'], $this->sugeridos([$pistola->id]));
    }

    public function test_la_compatibilidad_es_simetrica(): void
    {
        $pistola = $this->producto('Pistola PULY');
        $baston = $this->producto('Baston PULY');
        $chispaPuly = $this->producto('Chispa Fria PULY');

        // Se carga una sola vez, desde la chispa.
        $chispaPuly->sincronizarCompatibles([$pistola->id, $baston->id]);

        $this->assertSame(['Chispa Fria PULY'], $this->sugeridos([$pistola->id]));
        $this->assertSame(['Chispa Fria PULY'], $this->sugeridos([$baston->id]));
        $this->assertSame(['Pistola PULY', 'Baston PULY'], $this->sugeridos([$chispaPuly->id]));
    }

    public function test_lo_compatible_con_mas_productos_del_carrito_va_primero(): void
    {
        $pistola = $this->producto('Pistola PULY');
        $baston = $this->producto('Baston PULY');
        $chispaPuly = $this->producto('Chispa PULY');
        $recarga = $this->producto('Recarga');

        // La recarga está primero en el orden del admin, pero la chispa sirve para los dos.
        $pistola->sincronizarCompatibles([$recarga->id, $chispaPuly->id]);
        $baston->sincronizarCompatibles([$chispaPuly->id]);

        $this->assertSame(['Chispa PULY', 'Recarga'], $this->sugeridos([$pistola->id, $baston->id]));
    }

    public function test_indica_con_que_productos_del_carrito_es_compatible(): void
    {
        $pistola = $this->producto('Pistola PULY');
        $chispaPuly = $this->producto('Chispa PULY');
        $pistola->sincronizarCompatibles([$chispaPuly->id]);

        $this->getJson(route('carrito.sugerencias', ['productos' => [$pistola->id]]))
            ->assertJsonPath('productos.0.compatible_con', ['Pistola PULY']);
    }

    public function test_no_sugiere_lo_que_ya_esta_en_el_carrito_ni_inactivos_ni_sin_stock(): void
    {
        $base = $this->producto('Base');
        $enCarrito = $this->producto('Ya en carrito');
        $inactivo = $this->producto('Inactivo', ['is_active' => false]);
        $agotado = $this->producto('Agotado', ['stock' => 0]);
        $disponible = $this->producto('Disponible');

        $base->sincronizarCompatibles([$enCarrito->id, $inactivo->id, $agotado->id, $disponible->id]);

        $this->assertSame(['Disponible'], $this->sugeridos([$base->id, $enCarrito->id]));
    }

    public function test_respeta_el_orden_elegido_por_el_admin(): void
    {
        $base = $this->producto('Base');
        $a = $this->producto('A');
        $b = $this->producto('B');

        $base->sincronizarCompatibles([$b->id, $a->id]);

        $this->assertSame(['B', 'A'], $this->sugeridos([$base->id]));
    }

    public function test_sugerir_siempre_solo_aplica_si_el_carrito_no_tiene_compatibilidades(): void
    {
        $this->producto('Chispa generica', ['sugerir_en_carrito' => true]);
        $sinReglas = $this->producto('Pote de humo');
        $pistola = $this->producto('Pistola PULY');
        $chispaPuly = $this->producto('Chispa PULY');
        $pistola->sincronizarCompatibles([$chispaPuly->id]);

        // Sin nada compatible cargado, se ofrecen las "siempre".
        $this->assertSame(['Chispa generica'], $this->sugeridos([$sinReglas->id]));
        // Con una pistola PULY no se mezcla una chispa genérica...
        $this->assertSame(['Chispa PULY'], $this->sugeridos([$pistola->id]));
        // ...ni siquiera cuando su chispa compatible ya está en el carrito.
        $this->assertSame([], $this->sugeridos([$pistola->id, $chispaPuly->id]));
    }

    public function test_carrito_vacio_no_devuelve_sugerencias(): void
    {
        $this->producto('Siempre', ['sugerir_en_carrito' => true]);

        $this->getJson(route('carrito.sugerencias'))->assertOk()->assertExactJson(['productos' => []]);
    }

    public function test_producto_con_colores_activos_marca_tiene_variantes(): void
    {
        $base = $this->producto('Base');
        $conColor = $this->producto('Con color');
        $conColor->variantes()->create(['nombre' => 'Rojo', 'color_hex' => '#ff0000', 'stock' => 5, 'is_active' => true]);
        $base->sincronizarCompatibles([$conColor->id]);

        $this->getJson(route('carrito.sugerencias', ['productos' => [$base->id]]))
            ->assertOk()
            ->assertJsonPath('productos.0.tiene_variantes', true);
    }

    public function test_admin_guarda_compatibles_y_sugerir_siempre_al_editar_un_producto(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $producto = $this->producto('Producto');
        $a = $this->producto('A');
        $b = $this->producto('B');

        $this->actingAs($admin)->put(route('productos.update', $producto), [
            'titulo' => 'Producto',
            'precio' => 1000,
            'sugerir_en_carrito' => true,
            'compatibles' => [$b->id, $a->id],
        ])->assertSessionHasNoErrors();

        $producto->refresh();
        $this->assertTrue($producto->sugerir_en_carrito);
        $this->assertSame([$b->id, $a->id], $producto->idsCompatibles());
        // Y desde el otro lado también se ve.
        $this->assertSame([$producto->id], $a->idsCompatibles());
    }

    public function test_quitar_un_compatible_desde_el_otro_producto_lo_desvincula_en_ambos_sentidos(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $pistola = $this->producto('Pistola');
        $chispa = $this->producto('Chispa');
        $pistola->sincronizarCompatibles([$chispa->id]);

        // La chispa se edita sin la pistola (el par estaba guardado en el otro sentido).
        $this->actingAs($admin)->put(route('productos.update', $chispa), [
            'titulo' => 'Chispa',
            'precio' => 1000,
            'compatibles' => [],
        ])->assertSessionHasNoErrors();

        $this->assertSame([], $pistola->idsCompatibles());
        $this->assertSame([], $chispa->idsCompatibles());
    }

    public function test_un_producto_no_puede_ser_compatible_consigo_mismo(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $producto = $this->producto('Producto');

        $this->actingAs($admin)->put(route('productos.update', $producto), [
            'titulo' => 'Producto',
            'precio' => 1000,
            'compatibles' => [$producto->id],
        ])->assertSessionHasErrors('compatibles.0');
    }
}
