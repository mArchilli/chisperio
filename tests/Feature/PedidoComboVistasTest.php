<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\ConfiguracionEnvio;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cómo se ve y qué guarda un pedido con combos: el envío gratis del combo queda como
 * snapshot en la línea, y el listado/detalle del admin y la vidriera reciben lo necesario
 * para mostrar "Combo" y "Envío gratis" y para armar la línea del carrito.
 */
class PedidoComboVistasTest extends TestCase
{
    use RefreshDatabase;

    private function combo(bool $envioGratis, string $titulo = 'Combo Fiesta'): Combo
    {
        $producto = Producto::factory()->create(['precio' => 500, 'stock' => 20, 'is_active' => true]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 0, 'stock' => 6, 'is_active' => true,
        ]);

        $combo = Combo::create(['titulo' => $titulo, 'precio' => 3000, 'is_active' => true, 'envio_gratis' => $envioGratis]);
        ComboProducto::create([
            'combo_id' => $combo->id, 'producto_id' => $producto->id,
            'producto_variante_id' => $variante->id, 'cantidad' => 2, 'orden' => 0,
        ]);

        return $combo;
    }

    private function comprar(array $combos, array $items = []): Pedido
    {
        $respuesta = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente de prueba',
            'items' => $items,
            'combos' => array_map(fn (Combo $combo) => ['combo_id' => $combo->id, 'cantidad' => 1], $combos),
        ]);

        $respuesta->assertCreated();

        return Pedido::findOrFail($respuesta->json('id'));
    }

    public function test_el_checkout_guarda_el_envio_gratis_de_cada_combo_en_su_linea(): void
    {
        $conEnvio = $this->combo(true, 'Con envío');
        $sinEnvio = $this->combo(false, 'Sin envío');
        $suelto = Producto::factory()->create(['precio' => 100, 'stock' => 5, 'is_active' => true]);

        $pedido = $this->comprar([$conEnvio, $sinEnvio], [['producto_id' => $suelto->id, 'cantidad' => 1]]);

        $porTitulo = $pedido->items->keyBy('titulo');
        $this->assertTrue($porTitulo['Con envío']->envio_gratis);
        $this->assertFalse($porTitulo['Sin envío']->envio_gratis);
        $this->assertFalse($porTitulo[$suelto->titulo]->envio_gratis);
    }

    public function test_editar_el_combo_despues_no_cambia_lo_que_dice_el_pedido(): void
    {
        $combo = $this->combo(true);
        $pedido = $this->comprar([$combo]);

        $combo->update(['envio_gratis' => false, 'titulo' => 'Otro nombre']);

        $item = $this->actingAs(User::factory()->create())
            ->get(route('pedidos.show', $pedido))
            ->viewData('page')['props']['pedido']['items'][0];

        $this->assertSame($combo->id, $item['combo_id']);
        $this->assertSame('Combo Fiesta', $item['titulo']);
        $this->assertTrue($item['envio_gratis']);
    }

    public function test_el_detalle_y_el_listado_de_pedidos_traen_lo_necesario_para_mostrar_el_combo(): void
    {
        $pedido = $this->comprar([$this->combo(true)]);
        $admin = User::factory()->create();

        $detalle = $this->actingAs($admin)->get(route('pedidos.show', $pedido))->viewData('page')['props']['pedido'];
        $this->assertSame('Rojo', $detalle['items'][0]['combo_items_seleccionados'][0]['variante_nombre']);

        $listado = $this->actingAs($admin)->get(route('pedidos.index', ['estado' => 'todos']))->viewData('page')['props']['pedidos']['data'];
        $this->assertNotNull($listado[0]['items'][0]['combo_id']);
        $this->assertTrue($listado[0]['items'][0]['envio_gratis']);
    }

    public function test_la_vidriera_manda_la_receta_del_combo_para_el_agregar_rapido(): void
    {
        $this->combo(false);

        $combo = $this->get('/tienda')->viewData('page')['props']['combos'][0];

        $this->assertSame('combo', $combo['tipo']);
        $this->assertCount(1, $combo['items']);
        $item = $combo['items'][0];
        $this->assertSame(2, $item['cantidad']);
        $this->assertSame('Rojo', $item['producto_variante']['nombre']);
        $this->assertTrue($item['producto']['is_active']);
        $this->assertArrayHasKey('variantes_activas', $item['producto']);
        // Stock derivado: 6 unidades de la variante fija / 2 por combo = 3 combos.
        $this->assertSame(3, $combo['stock']);
    }
    /* ─── Regla: el envío gratis del combo vale solo si es lo único que se compra ─── */

    public function test_un_pedido_de_solo_un_combo_con_envio_gratis_lo_tiene_aunque_el_monto_no_se_alcance(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 1000000]);

        $pedido = $this->comprar([$this->combo(true)]);

        $this->assertTrue($pedido->envio_gratis);
    }

    public function test_un_combo_con_envio_gratis_mas_otro_item_no_lo_da_y_rige_el_monto(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 1000000]);
        $suelto = Producto::factory()->create(['precio' => 100, 'stock' => 5, 'is_active' => true]);

        $pedido = $this->comprar([$this->combo(true)], [['producto_id' => $suelto->id, 'cantidad' => 1]]);

        $this->assertFalse($pedido->envio_gratis);
        // La línea conserva lo que ofrecía el combo; lo que no cuenta es el pedido.
        $this->assertTrue($pedido->items->firstWhere('combo_id', '!=', null)->envio_gratis);
    }

    public function test_combo_mas_otro_item_si_alcanza_el_monto_tiene_envio_gratis_por_monto(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 3000]);
        $suelto = Producto::factory()->create(['precio' => 100, 'stock' => 5, 'is_active' => true]);

        $pedido = $this->comprar([$this->combo(true)], [['producto_id' => $suelto->id, 'cantidad' => 1]]);

        $this->assertTrue($pedido->envio_gratis); // 3000 + 100 >= 3000
    }

    public function test_con_varios_combos_hace_falta_que_todos_tengan_envio_gratis(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 1000000]);

        $this->assertTrue($this->comprar([$this->combo(true, 'A'), $this->combo(true, 'B')])->envio_gratis);
        $this->assertFalse($this->comprar([$this->combo(true, 'C'), $this->combo(false, 'D')])->envio_gratis);
        $this->assertFalse($this->comprar([$this->combo(false, 'E')])->envio_gratis);
    }

    public function test_al_editar_el_pedido_se_recalcula_el_envio_gratis_del_combo(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 1000000]);
        $suelto = Producto::factory()->create(['precio' => 100, 'stock' => 5, 'is_active' => true]);
        $pedido = $this->comprar([$this->combo(true)], [['producto_id' => $suelto->id, 'cantidad' => 1]]);
        $this->assertFalse($pedido->envio_gratis);

        $combo = $pedido->items->firstWhere('combo_id', '!=', null);
        $admin = User::factory()->create();

        // Quitar el producto suelto: queda solo el combo con envío gratis.
        $this->actingAs($admin)->put(route('pedidos.update', $pedido), [
            'cliente_nombre' => 'Cliente de prueba',
            // Igual que la pantalla de edición: manda la variante actual de cada componente del combo.
            'items' => [[
                'id' => $combo->id,
                'cantidad' => 1,
                'precio_unitario' => 3000,
                'componentes_variantes' => [$combo->combo_items_seleccionados[0]['producto_variante_id']],
            ]],
        ])->assertSessionHasNoErrors();

        $this->assertTrue($pedido->fresh()->envio_gratis);
    }

    public function test_la_migracion_marca_los_pedidos_viejos_que_eran_solo_combos_con_envio_gratis(): void
    {
        $soloCombo = Pedido::create(['cliente_nombre' => 'A', 'subtotal' => 3000, 'total' => 3000, 'estado' => 'pendiente', 'envio_gratis' => null]);
        $soloCombo->items()->create(['combo_id' => $this->combo(true)->id, 'titulo' => 'Combo', 'precio_unitario' => 3000, 'cantidad' => 1, 'subtotal' => 3000, 'envio_gratis' => true]);

        $mezclado = Pedido::create(['cliente_nombre' => 'B', 'subtotal' => 3100, 'total' => 3100, 'estado' => 'pendiente', 'envio_gratis' => null]);
        $mezclado->items()->create(['combo_id' => $this->combo(true, 'Otro')->id, 'titulo' => 'Combo', 'precio_unitario' => 3000, 'cantidad' => 1, 'subtotal' => 3000, 'envio_gratis' => true]);
        $mezclado->items()->create(['titulo' => 'Suelto', 'precio_unitario' => 100, 'cantidad' => 1, 'subtotal' => 100]);

        (require database_path('migrations/2026_10_05_160000_backfill_envio_gratis_de_pedidos_solo_combos.php'))->up();

        $this->assertTrue($soloCombo->fresh()->envio_gratis);
        $this->assertNull($mezclado->fresh()->envio_gratis);
    }
}
