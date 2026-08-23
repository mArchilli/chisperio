<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase 5: la información de descuento ya vive en el Pedido desde la Fase 4 (snapshot
 * codigo_descuento_texto/descuento_monto) — estos tests cubren que el listado y el
 * detalle de Admin/Pedidos la expongan en el prop Inertia tal como la necesita el
 * frontend (badge en Index, desglose en Show), sin recalcular nada.
 */
class AdminPedidosCodigoDescuentoTest extends TestCase
{
    use RefreshDatabase;

    private function crearPedidoConItem(
        Producto $producto,
        int $cantidad,
        EstadoPedido $estado = EstadoPedido::Pendiente,
        ?CodigoDescuento $codigo = null,
        float $descuentoMonto = 0
    ): Pedido {
        $subtotal = $producto->precio * $cantidad;

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => $subtotal,
            'total' => $subtotal - $descuentoMonto,
            'estado' => $estado,
            'codigo_descuento_id' => $codigo?->id,
            'codigo_descuento_texto' => $codigo?->codigo,
            'codigo_descuento_tipo' => $codigo?->tipo_descuento,
            'codigo_descuento_valor' => $codigo?->valor_descuento,
            'descuento_monto' => $descuentoMonto,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => $producto->precio,
            'cantidad' => $cantidad,
            'subtotal' => $subtotal,
        ]);

        return $pedido;
    }

    public function test_listado_expone_codigo_descuento_texto_en_pedido_con_codigo(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'BADGE10',
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 10,
        ]);
        $pedido = $this->crearPedidoConItem($producto, 1, EstadoPedido::Pendiente, $codigo, 100);

        $response = $this->actingAs($user)->get(route('pedidos.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Index')
            ->where('pedidos.data.0.id', $pedido->id)
            ->where('pedidos.data.0.codigo_descuento_texto', 'BADGE10')
        );
    }

    public function test_listado_no_expone_codigo_descuento_texto_en_pedido_sin_codigo(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->crearPedidoConItem($producto, 1, EstadoPedido::Pendiente);

        $response = $this->actingAs($user)->get(route('pedidos.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Index')
            ->where('pedidos.data.0.id', $pedido->id)
            ->where('pedidos.data.0.codigo_descuento_texto', null)
        );
    }

    public function test_detalle_de_pedido_con_codigo_expone_subtotal_descuento_y_total(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'DETALLE15',
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 15,
        ]);
        $pedido = $this->crearPedidoConItem($producto, 2, EstadoPedido::Pendiente, $codigo, 300);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Show')
            ->where('pedido.codigo_descuento_texto', 'DETALLE15')
            ->where('pedido.subtotal', '2000.00')
            ->where('pedido.descuento_monto', '300.00')
            ->where('pedido.total', '1700.00')
        );
    }

    public function test_detalle_de_pedido_sin_codigo_no_expone_descuento_como_relevante(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->crearPedidoConItem($producto, 1, EstadoPedido::Pendiente);

        $response = $this->actingAs($user)->get(route('pedidos.show', $pedido));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Pedidos/Show')
            ->where('pedido.codigo_descuento_texto', null)
            ->where('pedido.descuento_monto', '0.00')
            ->where('pedido.total', '1000.00')
        );
    }

    /**
     * El punto más fácil de arruinar sin darse cuenta: un pedido cancelado liberó su
     * cupo (CodigoDescuentoService::liberarUso, Fase 4) porque el descuento nunca se
     * cobró de verdad, así que no debe sumar al total descontado — aunque su snapshot
     * (descuento_monto) siga intacto en el propio Pedido para el historial.
     */
    public function test_total_descontado_excluye_pedidos_cancelados(): void
    {
        $user = User::factory()->create();
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'AGREGADO']);

        $this->crearPedidoConItem($producto, 1, EstadoPedido::Pendiente, $codigo, 150);
        $this->crearPedidoConItem($producto, 1, EstadoPedido::Despachado, $codigo, 200);
        $this->crearPedidoConItem($producto, 1, EstadoPedido::Cancelado, $codigo, 300);

        $response = $this->actingAs($user)->get(route('codigos-descuento.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/CodigosDescuento/Index')
            ->where('codigosDescuento.0.codigo', 'AGREGADO')
            ->where('codigosDescuento.0.total_descontado', 350)
        );
    }

    public function test_total_descontado_es_null_o_cero_para_codigo_sin_pedidos(): void
    {
        $user = User::factory()->create();
        CodigoDescuento::factory()->create(['codigo' => 'SINUSAR']);

        $response = $this->actingAs($user)->get(route('codigos-descuento.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/CodigosDescuento/Index')
            ->where('codigosDescuento.0.codigo', 'SINUSAR')
            ->where('codigosDescuento.0.total_descontado', null)
        );
    }
}
