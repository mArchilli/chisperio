<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoComboCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function payloadBase(array $overrides = []): array
    {
        return array_merge([
            'cliente_nombre' => 'Cliente de prueba',
            'cliente_dni' => null,
            'cliente_telefono' => null,
            'cliente_email' => null,
            'cliente_provincia' => null,
            'cliente_ciudad' => null,
            'cliente_codigo_postal' => null,
            'observaciones' => null,
            'items' => [],
        ], $overrides);
    }

    private function armarCombo(): array
    {
        // Item 1: variante fijada por el admin (sin selección del comprador).
        $productoFijo = Producto::factory()->create(['precio' => 999, 'stock' => 20, 'is_active' => true]);
        $varianteFija = ProductoVariante::create([
            'producto_id' => $productoFijo->id, 'nombre' => 'Dorado', 'color_hex' => '#ffd700',
            'precio_adicional' => 0, 'stock' => 5, 'is_active' => true,
        ]);

        // Item 2: sin variante fijada, el producto tiene variantes activas -> el
        // comprador debe elegir una.
        $productoAElegir = Producto::factory()->create(['precio' => 500, 'stock' => 20, 'is_active' => true]);
        $varianteRoja = ProductoVariante::create([
            'producto_id' => $productoAElegir->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 0, 'stock' => 3, 'is_active' => true,
        ]);
        $varianteAzul = ProductoVariante::create([
            'producto_id' => $productoAElegir->id, 'nombre' => 'Azul', 'color_hex' => '#0000ff',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);

        $combo = Combo::create([
            'titulo' => 'Combo Fiesta', 'precio' => 3000, 'is_active' => true,
        ]);

        $itemFijo = ComboProducto::create([
            'combo_id' => $combo->id, 'producto_id' => $productoFijo->id,
            'producto_variante_id' => $varianteFija->id, 'cantidad' => 2, 'orden' => 0,
        ]);
        $itemAElegir = ComboProducto::create([
            'combo_id' => $combo->id, 'producto_id' => $productoAElegir->id,
            'producto_variante_id' => null, 'cantidad' => 1, 'orden' => 1,
        ]);

        return compact('combo', 'itemFijo', 'itemAElegir', 'productoFijo', 'varianteFija', 'productoAElegir', 'varianteRoja', 'varianteAzul');
    }

    public function test_checkout_con_combo_resuelve_variante_fija_y_elegida_descuenta_stock_de_cada_componente(): void
    {
        ['combo' => $combo, 'itemAElegir' => $itemAElegir, 'varianteFija' => $varianteFija, 'varianteRoja' => $varianteRoja] = $this->armarCombo();

        $response = $this->postJson('/checkout', $this->payloadBase([
            'combos' => [
                [
                    'combo_id' => $combo->id,
                    'cantidad' => 2,
                    'selecciones' => [
                        ['combo_producto_id' => $itemAElegir->id, 'variante_id' => $varianteRoja->id],
                    ],
                ],
            ],
        ]));

        $response->assertCreated();

        $item = PedidoItem::where('combo_id', $combo->id)->firstOrFail();
        $this->assertSame('Combo Fiesta', $item->titulo);
        $this->assertSame(2, $item->cantidad);
        $this->assertSame(3000.0, (float) $item->precio_unitario);
        $this->assertSame(6000.0, (float) $item->subtotal);
        $this->assertNull($item->producto_id);

        $seleccionados = collect($item->combo_items_seleccionados);
        $this->assertCount(2, $seleccionados);

        $fijo = $seleccionados->firstWhere('producto_variante_id', $varianteFija->id);
        $this->assertSame(4, $fijo['cantidad_total']); // 2 por combo * 2 combos
        $elegido = $seleccionados->firstWhere('producto_variante_id', $varianteRoja->id);
        $this->assertSame(2, $elegido['cantidad_total']); // 1 por combo * 2 combos
        $this->assertSame('Rojo', $elegido['variante_nombre']);

        // Stock descontado de cada componente real, no del combo (que no tiene stock propio).
        $this->assertSame(1, $varianteFija->fresh()->stock); // 5 - 4
        $this->assertSame(1, $varianteRoja->fresh()->stock); // 3 - 2

        $this->assertSame(1, MovimientoStock::where('producto_variante_id', $varianteFija->id)->count());
        $this->assertSame(1, MovimientoStock::where('producto_variante_id', $varianteRoja->id)->count());
    }

    public function test_checkout_con_combo_sin_seleccion_requerida_rechaza_con_422(): void
    {
        ['combo' => $combo] = $this->armarCombo();

        $response = $this->postJson('/checkout', $this->payloadBase([
            'combos' => [
                ['combo_id' => $combo->id, 'cantidad' => 1],
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['combos']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, MovimientoStock::count());
    }

    public function test_checkout_con_combo_sin_stock_suficiente_rechaza_con_422_y_no_descuenta_nada(): void
    {
        ['combo' => $combo, 'itemAElegir' => $itemAElegir, 'varianteRoja' => $varianteRoja, 'varianteFija' => $varianteFija] = $this->armarCombo();

        // La variante roja solo tiene 3 de stock, y el combo usa 1 por unidad: con
        // cantidad=5 hacen falta 5, no alcanza.
        $response = $this->postJson('/checkout', $this->payloadBase([
            'combos' => [
                [
                    'combo_id' => $combo->id,
                    'cantidad' => 5,
                    'selecciones' => [
                        ['combo_producto_id' => $itemAElegir->id, 'variante_id' => $varianteRoja->id],
                    ],
                ],
            ],
        ]));

        $response->assertStatus(422);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(3, $varianteRoja->fresh()->stock);
        $this->assertSame(5, $varianteFija->fresh()->stock);
    }

    public function test_cancelar_pedido_con_combo_repone_stock_de_cada_componente(): void
    {
        ['combo' => $combo, 'itemAElegir' => $itemAElegir, 'varianteFija' => $varianteFija, 'varianteRoja' => $varianteRoja] = $this->armarCombo();

        $response = $this->postJson('/checkout', $this->payloadBase([
            'combos' => [
                [
                    'combo_id' => $combo->id,
                    'cantidad' => 1,
                    'selecciones' => [
                        ['combo_producto_id' => $itemAElegir->id, 'variante_id' => $varianteRoja->id],
                    ],
                ],
            ],
        ]));

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));

        $this->assertSame(3, $varianteFija->fresh()->stock); // 5 - 2
        $this->assertSame(2, $varianteRoja->fresh()->stock); // 3 - 1

        $this->actingAs(\App\Models\User::factory()->create(['role' => 'admin']))
            ->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'cancelado'])
            ->assertRedirect();

        $this->assertSame(5, $varianteFija->fresh()->stock);
        $this->assertSame(3, $varianteRoja->fresh()->stock);
    }

    public function test_combo_inactivo_rechaza_el_checkout(): void
    {
        ['combo' => $combo, 'itemAElegir' => $itemAElegir, 'varianteRoja' => $varianteRoja] = $this->armarCombo();
        $combo->update(['is_active' => false]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            'combos' => [
                [
                    'combo_id' => $combo->id,
                    'cantidad' => 1,
                    'selecciones' => [
                        ['combo_producto_id' => $itemAElegir->id, 'variante_id' => $varianteRoja->id],
                    ],
                ],
            ],
        ]));

        $response->assertStatus(422);
        $this->assertSame(0, Pedido::count());
    }

    public function test_checkout_mixto_con_producto_suelto_y_combo(): void
    {
        ['combo' => $combo, 'itemAElegir' => $itemAElegir, 'varianteRoja' => $varianteRoja] = $this->armarCombo();
        $productoSuelto = Producto::factory()->create(['precio' => 200, 'stock' => 10]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            'items' => [
                ['producto_id' => $productoSuelto->id, 'cantidad' => 2],
            ],
            'combos' => [
                [
                    'combo_id' => $combo->id,
                    'cantidad' => 1,
                    'selecciones' => [
                        ['combo_producto_id' => $itemAElegir->id, 'variante_id' => $varianteRoja->id],
                    ],
                ],
            ],
        ]));

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(2, $pedido->items()->count());
        // subtotal = 2*200 (producto suelto) + 3000 (combo)
        $this->assertSame(3400.0, (float) $pedido->subtotal);
        $this->assertSame(8, $productoSuelto->fresh()->stock);
    }
}
