<?php

namespace Tests\Unit\Services;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Exceptions\StockInsuficienteException;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockServiceTest extends TestCase
{
    use RefreshDatabase;

    private StockService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new StockService();
    }

    private function crearPedidoCon(Producto $producto, int $cantidad): Pedido
    {
        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 0,
            'total' => 0,
            'estado' => EstadoPedido::Pendiente,
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

    private function crearPedidoConVariante(ProductoVariante $variante, int $cantidad): Pedido
    {
        $producto = $variante->producto;

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 0,
            'total' => 0,
            'estado' => EstadoPedido::Pendiente,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'producto_variante_id' => $variante->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => $producto->precio,
            'cantidad' => $cantidad,
            'subtotal' => $producto->precio * $cantidad,
        ]);

        return $pedido;
    }

    // --- validarDisponibilidad ---

    public function test_validar_disponibilidad_devuelve_vacio_si_todo_alcanza(): void
    {
        $producto = Producto::factory()->create(['stock' => 5]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $producto->id, 'cantidad' => 3],
        ]);

        $this->assertSame([], $faltantes);
    }

    public function test_validar_disponibilidad_devuelve_item_con_stock_insuficiente(): void
    {
        $producto = Producto::factory()->create(['stock' => 2]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $producto->id, 'cantidad' => 5],
        ]);

        $this->assertCount(1, $faltantes);
        $this->assertSame([
            'producto_id' => $producto->id,
            'cantidad' => 5,
            'stock_disponible' => 2,
        ], $faltantes[0]);
    }

    public function test_validar_disponibilidad_reporta_stock_disponible_cero_si_no_hay_nada(): void
    {
        $producto = Producto::factory()->create(['stock' => 0]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $producto->id, 'cantidad' => 1],
        ]);

        $this->assertSame(0, $faltantes[0]['stock_disponible']);
    }

    public function test_validar_disponibilidad_producto_con_stock_null_siempre_disponible(): void
    {
        $producto = Producto::factory()->create(['stock' => null]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $producto->id, 'cantidad' => 999999],
        ]);

        $this->assertSame([], $faltantes);
    }

    public function test_validar_disponibilidad_mezcla_items_ok_y_faltantes(): void
    {
        $productoOk = Producto::factory()->create(['stock' => 10]);
        $productoFaltante = Producto::factory()->create(['stock' => 1]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $productoOk->id, 'cantidad' => 5],
            ['producto_id' => $productoFaltante->id, 'cantidad' => 3],
        ]);

        $this->assertCount(1, $faltantes);
        $this->assertSame($productoFaltante->id, $faltantes[0]['producto_id']);
    }

    // --- descontar ---

    public function test_descontar_resta_stock_y_crea_movimiento(): void
    {
        $producto = Producto::factory()->create(['stock' => 10]);
        $pedido = $this->crearPedidoCon($producto, 3);

        $this->service->descontar($pedido);

        $this->assertSame(7, $producto->fresh()->stock);

        $movimiento = MovimientoStock::where('producto_id', $producto->id)->firstOrFail();
        $this->assertSame(-3, $movimiento->cantidad);
        $this->assertSame(MotivoMovimientoStock::PedidoCreado, $movimiento->motivo);
        $this->assertSame($pedido->id, $movimiento->pedido_id);
        $this->assertSame(7, $movimiento->stock_resultante);
    }

    public function test_descontar_no_modifica_producto_con_stock_ilimitado_ni_genera_movimiento(): void
    {
        $producto = Producto::factory()->create(['stock' => null]);
        $pedido = $this->crearPedidoCon($producto, 5);

        $this->service->descontar($pedido);

        $this->assertNull($producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::where('producto_id', $producto->id)->count());
    }

    public function test_descontar_aborta_todo_el_pedido_si_un_item_no_tiene_stock_suficiente(): void
    {
        $productoConStock = Producto::factory()->create(['stock' => 10]);
        $productoSinStock = Producto::factory()->create(['stock' => 1]);

        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente de prueba',
            'subtotal' => 0,
            'total' => 0,
            'estado' => EstadoPedido::Pendiente,
        ]);

        $pedido->items()->create([
            'producto_id' => $productoConStock->id,
            'titulo' => $productoConStock->titulo,
            'precio_unitario' => $productoConStock->precio,
            'cantidad' => 2,
            'subtotal' => $productoConStock->precio * 2,
        ]);

        $pedido->items()->create([
            'producto_id' => $productoSinStock->id,
            'titulo' => $productoSinStock->titulo,
            'precio_unitario' => $productoSinStock->precio,
            'cantidad' => 5,
            'subtotal' => $productoSinStock->precio * 5,
        ]);

        try {
            $this->service->descontar($pedido);
            $this->fail('Se esperaba StockInsuficienteException.');
        } catch (StockInsuficienteException $e) {
            $this->assertSame($productoSinStock->id, $e->productoId);
            $this->assertSame(5, $e->cantidadSolicitada);
            $this->assertSame(1, $e->stockDisponible);
        }

        // Todo o nada: el producto que sí tenía stock no debe haber quedado descontado.
        $this->assertSame(10, $productoConStock->fresh()->stock);
        $this->assertSame(1, $productoSinStock->fresh()->stock);
        $this->assertSame(0, MovimientoStock::query()->count());
    }

    // --- reponer ---

    public function test_reponer_suma_stock_y_crea_movimiento(): void
    {
        $producto = Producto::factory()->create(['stock' => 4]);
        $pedido = $this->crearPedidoCon($producto, 3);

        $this->service->reponer($pedido);

        $this->assertSame(7, $producto->fresh()->stock);

        $movimiento = MovimientoStock::where('producto_id', $producto->id)->firstOrFail();
        $this->assertSame(3, $movimiento->cantidad);
        $this->assertSame(MotivoMovimientoStock::PedidoCancelado, $movimiento->motivo);
        $this->assertSame($pedido->id, $movimiento->pedido_id);
        $this->assertSame(7, $movimiento->stock_resultante);
    }

    public function test_reponer_no_modifica_producto_con_stock_ilimitado(): void
    {
        $producto = Producto::factory()->create(['stock' => null]);
        $pedido = $this->crearPedidoCon($producto, 5);

        $this->service->reponer($pedido);

        $this->assertNull($producto->fresh()->stock);
        $this->assertSame(0, MovimientoStock::where('producto_id', $producto->id)->count());
    }

    public function test_reponer_dos_veces_sobre_el_mismo_pedido_no_duplica_la_suma(): void
    {
        $producto = Producto::factory()->create(['stock' => 4]);
        $pedido = $this->crearPedidoCon($producto, 3);

        $this->service->reponer($pedido);
        $this->service->reponer($pedido);

        $this->assertSame(7, $producto->fresh()->stock);
        $this->assertSame(1, MovimientoStock::where('producto_id', $producto->id)->count());
    }

    // --- validarDisponibilidad con variante ---

    public function test_validar_disponibilidad_con_variante_chequea_stock_de_la_variante_no_del_producto(): void
    {
        // productos.stock queda en 0 a propósito: si el chequeo mirara el producto en vez
        // de la variante, esto reportaría falta de stock cuando en realidad hay de sobra.
        $producto = Producto::factory()->create(['stock' => 0]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => 10, 'is_active' => true,
        ]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $producto->id, 'variante_id' => $variante->id, 'cantidad' => 5],
        ]);

        $this->assertSame([], $faltantes);
    }

    public function test_validar_disponibilidad_con_variante_reporta_faltante_con_variante_id(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => 2, 'is_active' => true,
        ]);

        $faltantes = $this->service->validarDisponibilidad([
            ['producto_id' => $producto->id, 'variante_id' => $variante->id, 'cantidad' => 5],
        ]);

        $this->assertSame([[
            'producto_id' => $producto->id,
            'variante_id' => $variante->id,
            'cantidad' => 5,
            'stock_disponible' => 2,
        ]], $faltantes);
    }

    // --- descontar con variante ---

    public function test_descontar_con_variante_resta_stock_de_la_variante_y_deja_el_producto_intacto(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => 10, 'is_active' => true,
        ]);
        $pedido = $this->crearPedidoConVariante($variante, 3);

        $this->service->descontar($pedido);

        $this->assertSame(7, $variante->fresh()->stock);
        $this->assertSame(999, $producto->fresh()->stock);

        $movimiento = MovimientoStock::where('producto_variante_id', $variante->id)->firstOrFail();
        $this->assertSame($producto->id, $movimiento->producto_id);
        $this->assertSame(-3, $movimiento->cantidad);
        $this->assertSame(MotivoMovimientoStock::PedidoCreado, $movimiento->motivo);
        $this->assertSame(7, $movimiento->stock_resultante);
    }

    public function test_descontar_con_variante_ilimitada_no_genera_movimiento(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => null, 'is_active' => true,
        ]);
        $pedido = $this->crearPedidoConVariante($variante, 5);

        $this->service->descontar($pedido);

        $this->assertNull($variante->fresh()->stock);
        $this->assertSame(0, MovimientoStock::where('producto_variante_id', $variante->id)->count());
    }

    public function test_descontar_con_variante_sin_stock_suficiente_lanza_excepcion_con_variante_id(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => 1, 'is_active' => true,
        ]);
        $pedido = $this->crearPedidoConVariante($variante, 5);

        try {
            $this->service->descontar($pedido);
            $this->fail('Se esperaba StockInsuficienteException.');
        } catch (StockInsuficienteException $e) {
            $this->assertSame($producto->id, $e->productoId);
            $this->assertSame($variante->id, $e->varianteId);
            $this->assertSame(5, $e->cantidadSolicitada);
            $this->assertSame(1, $e->stockDisponible);
        }

        // Todo o nada, también para variantes: no queda descontada a medias.
        $this->assertSame(1, $variante->fresh()->stock);
        $this->assertSame(0, MovimientoStock::query()->count());
    }

    // --- reponer con variante ---

    public function test_reponer_con_variante_suma_stock_de_la_variante(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => 4, 'is_active' => true,
        ]);
        $pedido = $this->crearPedidoConVariante($variante, 3);

        $this->service->reponer($pedido);

        $this->assertSame(7, $variante->fresh()->stock);
        $this->assertSame(999, $producto->fresh()->stock);

        $movimiento = MovimientoStock::where('producto_variante_id', $variante->id)->firstOrFail();
        $this->assertSame(3, $movimiento->cantidad);
        $this->assertSame(MotivoMovimientoStock::PedidoCancelado, $movimiento->motivo);
        $this->assertSame(7, $movimiento->stock_resultante);
    }

    public function test_reponer_con_variante_dos_veces_no_duplica_la_suma(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        $variante = ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => 'Rojo', 'precio_adicional' => 0,
            'stock' => 4, 'is_active' => true,
        ]);
        $pedido = $this->crearPedidoConVariante($variante, 3);

        $this->service->reponer($pedido);
        $this->service->reponer($pedido);

        $this->assertSame(7, $variante->fresh()->stock);
        $this->assertSame(1, MovimientoStock::where('producto_variante_id', $variante->id)->count());
    }
}
