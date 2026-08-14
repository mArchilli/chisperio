<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\PedidoItem;
use App\Models\Producto;
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
            'cliente_direccion' => null,
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
}
