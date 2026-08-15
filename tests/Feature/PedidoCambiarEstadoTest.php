<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoCambiarEstadoTest extends TestCase
{
    use RefreshDatabase;

    private function crearPedidoConItem(Producto $producto, int $cantidad, EstadoPedido $estado): Pedido
    {
        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => $producto->precio * $cantidad,
            'total' => $producto->precio * $cantidad,
            'estado' => $estado,
            'despachado_at' => $estado === EstadoPedido::Despachado ? now() : null,
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

    private function cambiarEstado(Pedido $pedido, string $estado)
    {
        $user = User::factory()->create();

        return $this->actingAs($user)->patch(route('pedidos.cambiar-estado', $pedido), [
            'estado' => $estado,
        ]);
    }

    public function test_pendiente_a_despachado_no_toca_stock(): void
    {
        // stock=3 simula el estado ya descontado por un checkout real de cantidad=2 sobre un
        // producto que arrancó en 5.
        $producto = Producto::factory()->create(['stock' => 3]);
        $pedido = $this->crearPedidoConItem($producto, 2, EstadoPedido::Pendiente);

        $response = $this->cambiarEstado($pedido, 'despachado');

        $response->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
        $this->assertSame(3, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
    }

    public function test_despachado_a_pendiente_no_toca_stock(): void
    {
        $producto = Producto::factory()->create(['stock' => 3]);
        $pedido = $this->crearPedidoConItem($producto, 2, EstadoPedido::Despachado);

        $response = $this->cambiarEstado($pedido, 'pendiente');

        $response->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Pendiente, $pedido->fresh()->estado);
        $this->assertSame(3, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
    }

    public function test_pendiente_a_cancelado_repone_stock(): void
    {
        // stock=7 simula el estado ya descontado por un checkout real de cantidad=3 sobre un
        // producto que arrancó en 10.
        $producto = Producto::factory()->create(['stock' => 7]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Pendiente);

        $response = $this->cambiarEstado($pedido, 'cancelado');

        $response->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(10, $producto->fresh()->stock);

        $movimiento = MovimientoStock::where('producto_id', $producto->id)->firstOrFail();
        $this->assertSame(3, $movimiento->cantidad);
        $this->assertSame(MotivoMovimientoStock::PedidoCancelado, $movimiento->motivo);
        $this->assertSame($pedido->id, $movimiento->pedido_id);
        $this->assertSame(10, $movimiento->stock_resultante);
    }

    public function test_despachado_a_cancelado_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['stock' => 7]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Despachado);

        $response = $this->cambiarEstado($pedido, 'cancelado');

        $response->assertSessionHasErrors(['estado']);
        $this->assertSame(EstadoPedido::Despachado, $pedido->fresh()->estado);
        $this->assertSame(7, $producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::count());
    }

    public function test_cancelado_a_pendiente_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['stock' => 10]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Cancelado);

        $response = $this->cambiarEstado($pedido, 'pendiente');

        $response->assertSessionHasErrors(['estado']);
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(10, $producto->fresh()->stock);
    }

    public function test_cancelado_a_despachado_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['stock' => 10]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Cancelado);

        $response = $this->cambiarEstado($pedido, 'despachado');

        $response->assertSessionHasErrors(['estado']);
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(10, $producto->fresh()->stock);
    }

    public function test_cancelar_dos_veces_seguidas_la_segunda_se_rechaza_y_no_duplica_reposicion(): void
    {
        $producto = Producto::factory()->create(['stock' => 7]);
        $pedido = $this->crearPedidoConItem($producto, 3, EstadoPedido::Pendiente);

        $primera = $this->cambiarEstado($pedido, 'cancelado');
        $primera->assertSessionHasNoErrors();
        $this->assertSame(10, $producto->fresh()->stock);

        // La segunda llamada ya encuentra el pedido "cancelado": la rechaza la validación de
        // transición del punto 1, sin siquiera depender de la protección interna de
        // StockService::reponer() contra doble ejecución (esa protección también existe,
        // como red de seguridad extra si algo llama al servicio directo sin pasar por acá).
        $segunda = $this->cambiarEstado($pedido->fresh(), 'cancelado');
        $segunda->assertSessionHasErrors(['estado']);

        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame(1, MovimientoStock::where('producto_id', $producto->id)->count());
    }

    public function test_cancelar_pedido_con_producto_stock_null_no_genera_movimiento(): void
    {
        $producto = Producto::factory()->create(['stock' => null]);
        $pedido = $this->crearPedidoConItem($producto, 5, EstadoPedido::Pendiente);

        $response = $this->cambiarEstado($pedido, 'cancelado');

        $response->assertSessionHasNoErrors();
        $this->assertSame(EstadoPedido::Cancelado, $pedido->fresh()->estado);
        $this->assertNull($producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::where('producto_id', $producto->id)->count());
    }
}
