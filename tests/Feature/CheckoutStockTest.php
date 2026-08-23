<?php

namespace Tests\Feature;

use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutStockTest extends TestCase
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

    public function test_pedido_con_stock_suficiente_se_crea_y_descuenta_stock(): void
    {
        $productoA = Producto::factory()->create(['precio' => 100, 'stock' => 10]);
        $productoB = Producto::factory()->create(['precio' => 50, 'stock' => 5]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $productoA->id, 'cantidad' => 3],
            ['producto_id' => $productoB->id, 'cantidad' => 2],
        ]));

        $response->assertCreated();
        $response->assertJsonStructure(['id', 'total']);

        $this->assertSame(7, $productoA->fresh()->stock);
        $this->assertSame(3, $productoB->fresh()->stock);

        $pedidoId = $response->json('id');

        $movA = MovimientoStock::where('producto_id', $productoA->id)->firstOrFail();
        $this->assertSame(-3, $movA->cantidad);
        $this->assertSame('pedido_creado', $movA->motivo->value);
        $this->assertSame($pedidoId, $movA->pedido_id);
        $this->assertSame(7, $movA->stock_resultante);

        $movB = MovimientoStock::where('producto_id', $productoB->id)->firstOrFail();
        $this->assertSame(-2, $movB->cantidad);
        $this->assertSame(3, $movB->stock_resultante);
    }

    public function test_pedido_con_un_item_sin_stock_suficiente_se_rechaza_y_no_modifica_nada(): void
    {
        $productoConStock = Producto::factory()->create(['precio' => 100, 'stock' => 10]);
        $productoSinStock = Producto::factory()->create(['precio' => 50, 'stock' => 2]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $productoConStock->id, 'cantidad' => 3],
            ['producto_id' => $productoSinStock->id, 'cantidad' => 5],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(["stock.{$productoSinStock->id}"]);

        // El mensaje tiene que ser útil: cuánto queda realmente y de qué producto.
        // (la clave "stock.{id}" es literal, no dot-path anidado: se indexa directo)
        $mensaje = $response->json('errors')["stock.{$productoSinStock->id}"][0];
        $this->assertStringContainsString('2', $mensaje);
        $this->assertStringContainsString($productoSinStock->titulo, $mensaje);

        // Todo o nada: ni siquiera el producto que sí alcanzaba quedó modificado.
        $this->assertSame(10, $productoConStock->fresh()->stock);
        $this->assertSame(2, $productoSinStock->fresh()->stock);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, MovimientoStock::count());
    }

    public function test_pedido_con_producto_stock_null_se_crea_sin_generar_movimiento(): void
    {
        $productoIlimitado = Producto::factory()->create(['precio' => 100, 'stock' => null]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $productoIlimitado->id, 'cantidad' => 500],
        ]));

        $response->assertCreated();
        $this->assertNull($productoIlimitado->fresh()->stock);
        $this->assertSame(0, MovimientoStock::where('producto_id', $productoIlimitado->id)->count());
    }

    public function test_condicion_de_carrera_el_stock_cambia_entre_la_validacion_optimista_y_el_descuento_real(): void
    {
        $producto = Producto::factory()->create(['precio' => 100, 'stock' => 1]);

        // Simulamos que el chequeo optimista vio stock disponible (por ejemplo, se ejecutó
        // justo antes de que otro pedido concurrente se llevara la última unidad): mockeamos
        // solo validarDisponibilidad() para que diga "todo bien", pero descontar() corre real
        // (sin mockear) y ve el stock actual bajo lock, que ya está en 0.
        $this->partialMock(StockService::class, function ($mock) {
            $mock->shouldReceive('validarDisponibilidad')->once()->andReturn([]);
        });

        $producto->update(['stock' => 0]);

        $response = $this->postJson('/checkout', $this->payloadBase([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(["stock.{$producto->id}"]);

        // Rollback completo: el pedido que se había empezado a armar no queda persistido.
        $this->assertSame(0, $producto->fresh()->stock);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, PedidoItem::count());
        $this->assertSame(0, MovimientoStock::count());
    }
}
