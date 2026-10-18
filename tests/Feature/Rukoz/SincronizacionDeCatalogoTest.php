<?php

namespace Tests\Feature\Rukoz;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\User;
use App\Rukoz\CatalogoDeChisperio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Rukoz\CoreClient\Contratos\ProveedorCatalogo;
use Tests\Support\RukozFalso;
use Tests\TestCase;

/**
 * Guardar en el admin manda el sync parcial al Central solo con INTEGRACION_CATALOGO encendido,
 * y nunca rompe el guardado.
 */
class SincronizacionDeCatalogoTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create();
    }

    private function datosDeProducto(array $extra = []): array
    {
        return $extra + ['titulo' => 'Chispa nueva', 'precio' => 1000];
    }

    public function test_por_defecto_la_integracion_esta_apagada_en_la_suite(): void
    {
        $this->assertFalse((bool) config('integracion.catalogo'));
        $this->assertFalse((bool) config('integracion.stock'));
        $this->assertFalse((bool) config('integracion.checkout'));
        $this->assertFalse((bool) config('integracion.confirmacion'));
        $this->assertFalse((bool) config('rukoz.habilitada'));
        $this->assertFalse(app()->bound(ProveedorCatalogo::class));
    }

    public function test_crear_un_producto_con_el_interruptor_encendido_sincroniza_ese_producto(): void
    {
        config(['integracion.catalogo' => true]);
        $falso = RukozFalso::instalar();

        $this->actingAs($this->admin())
            ->post(route('productos.store'), $this->datosDeProducto())
            ->assertRedirect(route('productos.index'));

        $producto = Producto::where('titulo', 'Chispa nueva')->firstOrFail();
        $this->assertSame([[$producto->id]], $falso->idsDe('sincronizarProductos'));
        $this->assertSame([], $falso->idsDe('sincronizarCombos'));
    }

    public function test_guardar_un_producto_con_el_interruptor_apagado_no_llama_al_sync(): void
    {
        config(['integracion.catalogo' => false]);
        $falso = RukozFalso::instalar();

        $producto = Producto::factory()->create();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('productos.store'), $this->datosDeProducto())
            ->assertRedirect(route('productos.index'));

        $this->actingAs($admin)
            ->put(route('productos.update', $producto->id), $this->datosDeProducto(['titulo' => 'Otro']))
            ->assertRedirect(route('productos.index'));

        $this->assertSame([], $falso->llamadas);
        $this->assertDatabaseHas('productos', ['titulo' => 'Chispa nueva']);
        $this->assertDatabaseHas('productos', ['id' => $producto->id, 'titulo' => 'Otro']);
    }

    public function test_editar_un_producto_sincroniza_el_producto_y_despues_los_combos_que_lo_contienen(): void
    {
        config(['integracion.catalogo' => true]);

        $producto = Producto::factory()->create();
        $otro = Producto::factory()->create();
        $combo = Combo::create(['titulo' => 'C', 'precio' => 1, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $producto->id, 'cantidad' => 1, 'orden' => 0]);
        $sinRelacion = Combo::create(['titulo' => 'D', 'precio' => 1, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $sinRelacion->id, 'producto_id' => $otro->id, 'cantidad' => 1, 'orden' => 0]);

        $falso = RukozFalso::instalar();

        $this->actingAs($this->admin())
            ->put(route('productos.update', $producto->id), $this->datosDeProducto())
            ->assertRedirect(route('productos.index'));

        // Primero el producto, después el combo que lo contiene (el combo referencia productos ya enviados).
        $this->assertSame([
            ['sincronizarProductos', [$producto->id]],
            ['sincronizarCombos', [$combo->id]],
        ], $falso->llamadas);
    }

    public function test_crear_y_editar_un_combo_sincroniza_ese_combo(): void
    {
        config(['integracion.catalogo' => true]);
        $falso = RukozFalso::instalar();
        $producto = Producto::factory()->create();
        $payload = [
            'titulo' => 'Combo', 'precio' => 5000, 'descuento_activo' => false,
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1, 'producto_variante_id' => null]],
        ];

        $admin = $this->admin();
        $this->actingAs($admin)->post(route('combos.store'), $payload)->assertRedirect(route('combos.index'));
        $combo = Combo::firstOrFail();
        $this->actingAs($admin)->put(route('combos.update', $combo->id), $payload)->assertRedirect(route('combos.index'));

        $this->assertSame([['sincronizarCombos', [$combo->id]], ['sincronizarCombos', [$combo->id]]], $falso->llamadas);
    }

    public function test_guardar_un_combo_con_el_interruptor_apagado_no_llama_al_sync(): void
    {
        config(['integracion.catalogo' => false]);
        $falso = RukozFalso::instalar();
        $producto = Producto::factory()->create();

        $this->actingAs($this->admin())->post(route('combos.store'), [
            'titulo' => 'Combo', 'precio' => 5000, 'descuento_activo' => false,
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1, 'producto_variante_id' => null]],
        ])->assertRedirect(route('combos.index'));

        $this->assertSame([], $falso->llamadas);
        $this->assertDatabaseHas('combos', ['titulo' => 'Combo']);
    }

    public function test_si_el_sync_falla_el_guardado_funciona_igual(): void
    {
        config(['integracion.catalogo' => true]);
        $falso = RukozFalso::instalar();
        $falso->alLlamar = fn () => throw new \RuntimeException('boom');

        $this->actingAs($this->admin())
            ->post(route('productos.store'), $this->datosDeProducto())
            ->assertRedirect(route('productos.index'))
            ->assertSessionHasNoErrors();

        $this->assertCount(1, $falso->llamadas);
        $this->assertDatabaseHas('productos', ['titulo' => 'Chispa nueva']);
    }

    public function test_con_el_central_caido_el_guardado_funciona_y_el_id_queda_diferido(): void
    {
        // Paquete real (sin mocks), integración encendida, y el Central sin responder.
        config([
            'integracion.catalogo' => true,
            'rukoz.habilitada' => true,
            'rukoz.url' => 'http://central.test',
            'rukoz.api_key' => 'rk_prueba',
            'rukoz.secret' => 'secreto-de-prueba',
            'rukoz.reintentos' => 0,
        ]);
        app()->bind(ProveedorCatalogo::class, CatalogoDeChisperio::class);
        Http::fake(fn () => throw new ConnectionException('Central caído'));

        $this->actingAs($this->admin())
            ->post(route('productos.store'), $this->datosDeProducto(['titulo' => 'Con el central caído']))
            ->assertRedirect(route('productos.index'))
            ->assertSessionHasNoErrors();

        $producto = Producto::where('titulo', 'Con el central caído')->firstOrFail();
        $this->assertDatabaseHas('rukoz_estado', ['clave' => 'catalogo_parcial_pendiente']);
        $this->assertStringContainsString((string) $producto->id, (string) \DB::table('rukoz_estado')->where('clave', 'catalogo_parcial_pendiente')->value('valor'));
    }
}
