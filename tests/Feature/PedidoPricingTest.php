<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoPricingTest extends TestCase
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

    public function test_pedido_con_cantidad_en_escala_y_oferta_usa_el_precio_de_pricing_service(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
        ]);

        $cantidad = 15;
        $esperado = app(PricingService::class)->calcularPrecio($producto->fresh(), $cantidad);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => $cantidad],
        ]));

        $response->assertCreated();

        $item = PedidoItem::where('producto_id', $producto->id)->firstOrFail();

        $this->assertSame($esperado->precio_unitario_final, (float) $item->precio_unitario);
        $this->assertSame(720.0, (float) $item->precio_unitario);
        $this->assertSame(round($esperado->precio_unitario_final * $cantidad, 2), (float) $item->subtotal);
    }

    public function test_pedido_con_cantidad_fuera_de_cualquier_escala_usa_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);

        $cantidad = 3;

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => $cantidad],
        ]));

        $response->assertCreated();

        $item = PedidoItem::where('producto_id', $producto->id)->firstOrFail();

        $this->assertSame(1000.0, (float) $item->precio_unitario);
        $this->assertSame(3000.0, (float) $item->subtotal);
    }

    public function test_pedido_con_varios_items_calcula_cada_uno_de_forma_independiente(): void
    {
        $productoA = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $productoA->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);

        $productoB = Producto::factory()->create(['precio' => 500]);
        Oferta::factory()->create([
            'producto_id' => $productoB->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Fijo,
            'valor_descuento' => 50,
        ]);

        $productoC = Producto::factory()->create(['precio' => 200]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $productoA->id, 'cantidad' => 20],
            ['producto_id' => $productoB->id, 'cantidad' => 2],
            ['producto_id' => $productoC->id, 'cantidad' => 4],
        ]));

        $response->assertCreated();

        $itemA = PedidoItem::where('producto_id', $productoA->id)->firstOrFail();
        $itemB = PedidoItem::where('producto_id', $productoB->id)->firstOrFail();
        $itemC = PedidoItem::where('producto_id', $productoC->id)->firstOrFail();

        $this->assertSame(800.0, (float) $itemA->precio_unitario);
        $this->assertSame(450.0, (float) $itemB->precio_unitario);
        $this->assertSame(200.0, (float) $itemC->precio_unitario);
    }

    public function test_un_producto_repartido_en_varios_colores_se_cobra_al_precio_del_total_de_unidades(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 5,
            'precio_unitario' => 800,
        ]);
        $rojo = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000',
            'precio_adicional' => 100, 'stock' => 10, 'is_active' => true,
        ]);
        $azul = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Azul', 'color_hex' => '#0000ff',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);

        // 2 rojas + 3 azules = 5 unidades del producto → las dos líneas se cobran al
        // precio de la escala de 5, no al precio base (que sería lo que le tocaría a
        // una línea de 2 o de 3 por sí sola).
        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $rojo->id],
            ['producto_id' => $producto->id, 'cantidad' => 3, 'variante_id' => $azul->id],
        ]));

        $response->assertCreated();

        $itemRojo = PedidoItem::where('producto_variante_id', $rojo->id)->firstOrFail();
        $itemAzul = PedidoItem::where('producto_variante_id', $azul->id)->firstOrFail();

        // Precio de la escala (800) + el recargo de cada color.
        $this->assertSame(900.0, (float) $itemRojo->precio_unitario);
        $this->assertSame(800.0, (float) $itemAzul->precio_unitario);
        $this->assertSame(1800.0, (float) $itemRojo->subtotal);
        $this->assertSame(2400.0, (float) $itemAzul->subtotal);
        $this->assertSame(4200.0, (float) Pedido::firstOrFail()->subtotal);

        // El stock se descuenta por variante.
        $this->assertSame(8, $rojo->fresh()->stock);
        $this->assertSame(7, $azul->fresh()->stock);
    }

    public function test_reparto_en_colores_que_no_llega_a_ninguna_escala_usa_precio_base(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        $rojo = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);
        $azul = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Azul',
            'precio_adicional' => 0, 'stock' => 10, 'is_active' => true,
        ]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $rojo->id],
            ['producto_id' => $producto->id, 'cantidad' => 3, 'variante_id' => $azul->id],
        ]));

        $response->assertCreated();

        $this->assertSame(1000.0, (float) PedidoItem::where('producto_variante_id', $rojo->id)->value('precio_unitario'));
        $this->assertSame(1000.0, (float) PedidoItem::where('producto_variante_id', $azul->id)->value('precio_unitario'));
    }
}
