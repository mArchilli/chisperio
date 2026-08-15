<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoShowMovimientosStockTest extends TestCase
{
    use RefreshDatabase;

    private function crearPedidoConItem(Producto $producto, int $cantidad, EstadoPedido $estado): Pedido
    {
        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => $producto->precio * $cantidad,
            'total' => $producto->precio * $cantidad,
            'estado' => $estado,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => $producto->precio,
            'cantidad' => $cantidad,
            'subtotal' => $producto->precio * $cantidad,
        ]);

        return $pedido;
    }

    public function test_pedido_cancelado_expone_los_movimientos_de_stock_repuestos(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['titulo' => 'Producto Repuesto', 'stock' => 7]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Pendiente);

        app(StockService::class)->reponer($pedido);
        $pedido->update(['estado' => EstadoPedido::Cancelado]);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Show')
            ->has('pedido.movimientos_stock', 1)
            ->where('pedido.movimientos_stock.0.cantidad', 3)
            ->where('pedido.movimientos_stock.0.stock_resultante', 10)
            ->where('pedido.movimientos_stock.0.producto.titulo', 'Producto Repuesto')
        );
    }

    public function test_pedido_pendiente_no_expone_movimientos_de_stock(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['stock' => 10]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Pendiente);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Show')
            ->has('pedido.movimientos_stock', 0)
        );
    }
}
