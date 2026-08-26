<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PedidoVariantesAddonsTest extends TestCase
{
    use RefreshDatabase;

    private function payloadBase(array $items): array
    {
        return [
            'cliente_nombre' => 'Cliente de prueba',
            'cliente_dni' => null,
            'cliente_telefono' => null,
            'cliente_email' => null,
            'cliente_provincia' => null,
            'cliente_ciudad' => null,
            'cliente_codigo_postal' => null,
            'observaciones' => null,
            'items' => $items,
        ];
    }

    public function test_pedido_con_variante_y_addons_guarda_el_snapshot_completo_y_recalcula_el_precio(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 150, 'stock' => 10, 'is_active' => true,
        ]);
        $addon = Addon::create([
            'nombre' => 'Grabado', 'precio' => 300, 'requiere_texto' => true,
            'max_caracteres' => 30, 'is_active' => true,
        ]);
        $producto->addons()->attach($addon->id, ['precio_override' => 250, 'orden' => 0]);

        // El frontend manda nombre/precio "de más" (snapshot viejo del carrito) — el
        // backend nunca debe confiar en esos valores, solo en addon_id/texto_personalizado.
        $response = $this->postJson('/checkout', $this->payloadBase([
            [
                'producto_id' => $producto->id,
                'cantidad' => 2,
                'variante_id' => $variante->id,
                'addons' => [
                    ['addon_id' => $addon->id, 'texto_personalizado' => 'Juan'],
                ],
            ],
        ]));

        $response->assertCreated();

        $item = PedidoItem::where('producto_id', $producto->id)->firstOrFail();

        $this->assertSame($variante->id, $item->producto_variante_id);
        $this->assertSame('Rojo', $item->variante_nombre);
        $this->assertSame('#ff0000', $item->variante_color_hex);
        $this->assertSame(150.0, (float) $item->recargo_variante_unitario);
        $this->assertSame(1000.0, (float) $item->precio_base_unitario);
        $this->assertSame(250.0, (float) $item->addons_total_unitario);
        // precio_unitario final = precio_base + recargo_variante + addons_total
        $this->assertSame(1400.0, (float) $item->precio_unitario);
        $this->assertSame(2800.0, (float) $item->subtotal);

        $this->assertSame([
            [
                'addon_id' => $addon->id,
                'nombre' => 'Grabado',
                'precio' => 250,
                'texto_personalizado' => 'Juan',
            ],
        ], $item->addons_seleccionados);

        // El stock se descontó de la VARIANTE, no del producto.
        $this->assertSame(8, $variante->fresh()->stock);
        $mov = MovimientoStock::where('producto_variante_id', $variante->id)->firstOrFail();
        $this->assertSame(-2, $mov->cantidad);
    }

    public function test_pedido_sin_variante_ni_addons_guarda_los_campos_nuevos_en_null_o_cero(): void
    {
        $producto = Producto::factory()->create(['precio' => 500, 'stock' => 10]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ]));

        $response->assertCreated();

        $item = PedidoItem::where('producto_id', $producto->id)->firstOrFail();

        $this->assertNull($item->producto_variante_id);
        $this->assertNull($item->variante_nombre);
        $this->assertNull($item->variante_color_hex);
        $this->assertSame(0.0, (float) $item->recargo_variante_unitario);
        $this->assertNull($item->addons_seleccionados);
        $this->assertSame(0.0, (float) $item->addons_total_unitario);
        $this->assertSame(500.0, (float) $item->precio_base_unitario);
        $this->assertSame(500.0, (float) $item->precio_unitario);
    }

    public function test_variante_que_no_pertenece_al_producto_rechaza_todo_el_pedido(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $otroProducto = Producto::factory()->create(['precio' => 500]);
        $varianteDeOtroProducto = ProductoVariante::create([
            'producto_id' => $otroProducto->id, 'nombre' => 'Azul', 'color_hex' => '#0000ff',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            [
                'producto_id' => $producto->id,
                'cantidad' => 1,
                'variante_id' => $varianteDeOtroProducto->id,
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['variante_id']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, PedidoItem::count());
    }

    public function test_addon_no_asociado_al_producto_rechaza_todo_el_pedido(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $addonNoAsociado = Addon::create(['nombre' => 'Extra', 'precio' => 100, 'is_active' => true]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            [
                'producto_id' => $producto->id,
                'cantidad' => 1,
                'addons' => [['addon_id' => $addonNoAsociado->id]],
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['addon_ids']);
        $this->assertSame(0, Pedido::count());
    }

    public function test_addon_que_requiere_texto_sin_texto_personalizado_rechaza_todo_el_pedido(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $addon = Addon::create([
            'nombre' => 'Grabado', 'precio' => 300, 'requiere_texto' => true, 'is_active' => true,
        ]);
        $producto->addons()->attach($addon->id);

        $response = $this->postJson('/checkout', $this->payloadBase([
            [
                'producto_id' => $producto->id,
                'cantidad' => 1,
                'addons' => [['addon_id' => $addon->id, 'texto_personalizado' => '   ']],
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['addons']);
        $this->assertSame(0, Pedido::count());
        // No debe descontarse stock ni quedar nada a medio crear (rollback completo).
        $this->assertSame(0, DB::table('pedido_items')->count());
    }
}
