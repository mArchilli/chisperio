<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * 11.2 — Con el stock del Central aparecen 0 y números bajos de verdad (hasta ahora todo era NULL = ilimitado).
 * Qué ve y qué puede comprar el cliente cuando algo está en 0.
 */
class TiendaStockCeroTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $extra): array
    {
        return $extra + [
            'cliente_nombre' => 'Cliente de prueba', 'cliente_dni' => null, 'cliente_telefono' => null, 'cliente_email' => null,
            'cliente_provincia' => null, 'cliente_ciudad' => null, 'cliente_codigo_postal' => null, 'observaciones' => null,
            'items' => [],
        ];
    }

    private function variante(Producto $producto, string $nombre, ?int $stock): ProductoVariante
    {
        return ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => $nombre, 'color_hex' => '#123456',
            'precio_adicional' => 0, 'stock' => $stock, 'is_active' => true,
        ]);
    }

    private function listado(): array
    {
        $r = $this->get('/tienda')->assertOk();

        return collect($r->viewData('page')['props']['productos']['data'])->pluck('titulo')->all();
    }

    public function test_el_listado_manda_al_final_al_producto_cuyas_variantes_estan_todas_en_cero(): void
    {
        $agotado = Producto::factory()->create(['titulo' => 'A agotado', 'stock' => null, 'is_active' => true]);
        $this->variante($agotado, 'Dorada', 0);
        $this->variante($agotado, 'Negra', 0);

        $conStock = Producto::factory()->create(['titulo' => 'B con stock', 'stock' => null, 'is_active' => true]);
        $this->variante($conStock, 'Dorada', 0);
        $this->variante($conStock, 'Negra', 4);

        $simpleEnCero = Producto::factory()->create(['titulo' => 'C simple en cero', 'stock' => 0, 'is_active' => true]);
        $ilimitado = Producto::factory()->create(['titulo' => 'D ilimitado', 'stock' => null, 'is_active' => true]);

        $this->assertSame(['B con stock', 'D ilimitado', 'A agotado', 'C simple en cero'], $this->listado());
        $this->assertNotNull($simpleEnCero);
        $this->assertNotNull($ilimitado);
    }

    public function test_el_listado_sigue_mostrando_los_productos_sin_stock_con_su_stock_para_marcarlos(): void
    {
        $p = Producto::factory()->create(['stock' => 0, 'is_active' => true]);

        $r = $this->get('/tienda')->assertOk();
        $fila = collect($r->viewData('page')['props']['productos']['data'])->firstWhere('id', $p->id);

        $this->assertSame(0, $fila['stock']);
    }

    public function test_la_ficha_de_un_producto_en_cero_se_abre_y_lleva_el_stock_de_cada_color(): void
    {
        $p = Producto::factory()->create(['stock' => null, 'is_active' => true]);
        $this->variante($p, 'Dorada', 0);
        $this->variante($p, 'Negra', 2);

        $props = $this->get(route('tienda.show', $p))->assertOk()->viewData('page')['props']['producto'];

        $this->assertSame([0, 2], collect($props['variantes'])->pluck('stock')->all());
    }

    public function test_el_checkout_rechaza_un_producto_en_cero_con_un_mensaje_claro(): void
    {
        $p = Producto::factory()->create(['titulo' => 'Pistola Volcán', 'precio' => 100, 'stock' => 0]);

        $r = $this->postJson('/checkout', $this->payload(['items' => [['producto_id' => $p->id, 'cantidad' => 1]]]));

        $r->assertStatus(422);
        $this->assertSame('No queda stock de Pistola Volcán.', $r->json('errors')["stock.{$p->id}"][0]);
        $this->assertSame(0, Pedido::count());
    }

    public function test_el_checkout_rechaza_pedir_mas_de_lo_que_hay_y_dice_cuanto_queda(): void
    {
        $p = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 100, 'stock' => 2]);

        $r = $this->postJson('/checkout', $this->payload(['items' => [['producto_id' => $p->id, 'cantidad' => 3]]]));

        $r->assertStatus(422);
        $this->assertStringContainsString('Solo quedan 2 unidades de Bengala', $r->json('errors')["stock.{$p->id}"][0]);
        $this->assertSame(2, $p->fresh()->stock);
    }

    public function test_el_checkout_nombra_el_color_sin_stock(): void
    {
        $p = Producto::factory()->create(['titulo' => 'Chispa PULY', 'precio' => 100, 'stock' => null]);
        $dorada = $this->variante($p, 'Dorada', 0);
        $negra = $this->variante($p, 'Negra', 0);

        $r = $this->postJson('/checkout', $this->payload(['items' => [
            ['producto_id' => $p->id, 'variante_id' => $dorada->id, 'cantidad' => 1],
            ['producto_id' => $p->id, 'variante_id' => $negra->id, 'cantidad' => 1],
        ]]));

        $r->assertStatus(422);
        $mensajes = $r->json('errors')["stock.{$p->id}"];
        $this->assertContains('No queda stock de Chispa PULY (Dorada).', $mensajes);
        $this->assertContains('No queda stock de Chispa PULY (Negra).', $mensajes); // no se pisan entre sí
        $this->assertSame(0, Pedido::count());
    }

    public function test_un_combo_con_un_componente_en_cero_no_se_puede_comprar(): void
    {
        $fijo = Producto::factory()->create(['precio' => 100, 'stock' => 0, 'is_active' => true]);
        $otro = Producto::factory()->create(['precio' => 100, 'stock' => 50, 'is_active' => true]);
        $combo = Combo::create(['titulo' => 'Combo asd', 'precio' => 500, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $otro->id, 'cantidad' => 1, 'orden' => 0]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $fijo->id, 'cantidad' => 2, 'orden' => 1]);

        // La ficha del combo lo informa en 0 (el front muestra «Sin stock»)...
        $props = $this->get(route('combos.show', $combo))->assertOk()->viewData('page')['props']['combo'];
        $this->assertSame(0, $props['stock']);

        // ...y el checkout lo rechaza.
        $r = $this->postJson('/checkout', $this->payload(['combos' => [['combo_id' => $combo->id, 'cantidad' => 1, 'selecciones' => []]]]));

        $r->assertStatus(422)->assertJsonValidationErrors(["stock.{$fijo->id}"]);
        $this->assertSame(0, Pedido::count());
    }

    public function test_un_combo_con_el_color_elegido_en_cero_no_se_puede_comprar(): void
    {
        $producto = Producto::factory()->create(['precio' => 100, 'stock' => null, 'is_active' => true]);
        $sinStock = $this->variante($producto, 'Rojo', 0);
        $this->variante($producto, 'Azul', 5);
        $combo = Combo::create(['titulo' => 'Combo colores', 'precio' => 500, 'is_active' => true]);
        $linea = ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $producto->id, 'cantidad' => 1, 'orden' => 0]);

        $r = $this->postJson('/checkout', $this->payload(['combos' => [[
            'combo_id' => $combo->id, 'cantidad' => 1,
            'selecciones' => [['combo_producto_id' => $linea->id, 'variante_id' => $sinStock->id]],
        ]]]));

        $r->assertStatus(422)->assertJsonValidationErrors(["stock.{$producto->id}"]);
        $this->assertSame(0, Pedido::count());
    }
}
