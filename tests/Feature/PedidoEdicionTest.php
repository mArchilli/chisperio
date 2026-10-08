<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Enums\Sucursal;
use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use App\Models\Combo;
use App\Models\ConfiguracionEnvio;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\PlanPagoTarjeta;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoEdicionTest extends TestCase
{
    use RefreshDatabase;

    private function variante(Producto $producto, string $nombre, float $adicional = 0, ?int $stock = 10): ProductoVariante
    {
        return ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => $nombre,
            'color_hex' => '#123456',
            'precio_adicional' => $adicional,
            'stock' => $stock,
            'is_active' => true,
        ]);
    }

    /** Crea el pedido por el checkout real, así el stock queda descontado como en producción. */
    private function comprar(array $items, array $extra = []): Pedido
    {
        $response = $this->postJson('/checkout', [
            'cliente_nombre' => 'Cliente de prueba',
            'cliente_telefono' => '11 2345-6789',
            'items' => $items,
            ...$extra,
        ]);

        $response->assertCreated();

        return Pedido::findOrFail($response->json('id'));
    }

    /** Payload de edición que deja todo igual, para pisar solo lo que cada test cambia. */
    private function payload(Pedido $pedido, array $itemsOverride = [], array $extra = []): array
    {
        $items = $pedido->items->map(fn ($item, $i) => [
            'id' => $item->id,
            'cantidad' => $item->cantidad,
            'precio_unitario' => (float) $item->precio_unitario,
            'variante_id' => $item->producto_variante_id,
            'color_personalizado_texto' => $item->color_personalizado_texto,
            ...($itemsOverride[$i] ?? []),
        ])->all();

        return [
            'cliente_nombre' => $pedido->cliente_nombre,
            'cliente_telefono' => $pedido->cliente_telefono,
            'items' => $items,
            ...$extra,
        ];
    }

    private function editar(Pedido $pedido, array $payload, ?User $usuario = null)
    {
        return $this->actingAs($usuario ?? User::factory()->create())
            ->put(route('pedidos.update', $pedido), $payload);
    }

    /* ─── Envío gratis: snapshot al comprar ─────────────────────────────────── */

    public function test_checkout_guarda_si_el_subtotal_alcanzo_el_envio_gratis(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 1500]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $alcanza = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $noAlcanza = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $this->assertTrue($alcanza->envio_gratis);
        $this->assertSame(1500.0, (float) $alcanza->envio_gratis_monto_minimo);
        $this->assertFalse($noAlcanza->envio_gratis);
    }

    public function test_checkout_con_envio_gratis_desactivado_no_lo_marca(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);

        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 5]]);

        $this->assertFalse($pedido->envio_gratis);
    }

    public function test_el_detalle_expone_el_envio_gratis_del_pedido(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 500]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.show', $pedido))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Pedidos/Show')
                ->where('pedido.envio_gratis', true)
                ->where('pedido.envio_gratis_monto_minimo', '500.00'));
    }

    /* ─── Edición: variante, cantidad y precio ──────────────────────────────── */

    public function test_cambiar_la_variante_mueve_el_stock_de_una_a_otra(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 100]);
        $rojo = $this->variante($producto, 'Rojo', 0, 10);
        $azul = $this->variante($producto, 'Azul', 200, 10);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $rojo->id]]);

        $this->assertSame(8, $rojo->fresh()->stock);

        $this->editar($pedido, $this->payload($pedido, [['variante_id' => $azul->id, 'precio_unitario' => 1200]]))
            ->assertRedirect(route('pedidos.show', $pedido))
            ->assertSessionHasNoErrors();

        $this->assertSame(10, $rojo->fresh()->stock);
        $this->assertSame(8, $azul->fresh()->stock);

        $item = $pedido->fresh()->items->first();
        $this->assertSame($azul->id, $item->producto_variante_id);
        $this->assertSame('Azul', $item->variante_nombre);
        $this->assertSame(200.0, (float) $item->recargo_variante_unitario);
        $this->assertSame(2400.0, (float) $item->subtotal);
        $this->assertSame(2400.0, (float) $pedido->fresh()->total);
        $this->assertNotNull($pedido->fresh()->editado_at);
    }

    public function test_los_movimientos_de_la_edicion_son_ajustes_y_no_pisan_la_reposicion_por_cancelacion(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 3]]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 1]]))->assertSessionHasNoErrors();

        $this->assertSame(9, $producto->fresh()->stock);

        $ajuste = MovimientoStock::where('pedido_id', $pedido->id)->where('motivo', MotivoMovimientoStock::AjusteManual)->sole();
        $this->assertSame(2, $ajuste->cantidad);
        $this->assertSame(9, $ajuste->stock_resultante);

        // Cancelar después de editar repone solo lo que quedó (1), no lo del pedido original.
        $this->actingAs(User::factory()->create())
            ->patch(route('pedidos.cambiar-estado', $pedido), ['estado' => 'cancelado']);

        $this->assertSame(10, $producto->fresh()->stock);
    }

    public function test_subir_la_cantidad_descuenta_solo_la_diferencia(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 5]]))->assertSessionHasNoErrors();

        $this->assertSame(5, $producto->fresh()->stock);
        $this->assertSame(5000.0, (float) $pedido->fresh()->total);
    }

    public function test_subir_la_cantidad_sin_stock_suficiente_rechaza_y_no_cambia_nada(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 4]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 9]], ['cliente_nombre' => 'Otro nombre']))
            ->assertSessionHasErrors('items');

        $this->assertSame(2, $producto->fresh()->stock);
        $this->assertSame(2, $pedido->fresh()->items->first()->cantidad);
        $this->assertSame('Cliente de prueba', $pedido->fresh()->cliente_nombre);
        $this->assertNull($pedido->fresh()->editado_at);
    }

    public function test_bajar_el_precio_unitario_recalcula_subtotal_y_total(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);

        $this->editar($pedido, $this->payload($pedido, [['precio_unitario' => 850.5]]))->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(1701.0, (float) $pedido->subtotal);
        $this->assertSame(1701.0, (float) $pedido->total);
        $this->assertSame(10 - 2, $producto->fresh()->stock);
    }

    public function test_se_pueden_editar_los_datos_del_cliente(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $this->editar($pedido, $this->payload($pedido, [], [
            'cliente_nombre' => 'Nombre corregido',
            'cliente_telefono' => '351 555-1234',
            'cliente_ciudad' => 'Córdoba',
            'observaciones' => 'Entregar por la tarde',
        ]))->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame('Nombre corregido', $pedido->cliente_nombre);
        $this->assertSame('351 555-1234', $pedido->cliente_telefono);
        $this->assertSame('Córdoba', $pedido->cliente_ciudad);
        $this->assertSame('Entregar por la tarde', $pedido->observaciones);
    }

    /* ─── Edición: derivados del snapshot ───────────────────────────────────── */

    public function test_el_descuento_porcentual_se_recalcula_con_el_nuevo_subtotal(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        CodigoDescuento::factory()->create(['codigo' => 'DIEZ', 'tipo_descuento' => TipoDescuento::Porcentaje, 'valor_descuento' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]], ['codigo_descuento' => 'DIEZ']);

        $this->assertSame(200.0, (float) $pedido->descuento_monto);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 1]]))->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(1000.0, (float) $pedido->subtotal);
        $this->assertSame(100.0, (float) $pedido->descuento_monto);
        $this->assertSame(900.0, (float) $pedido->total);
    }

    public function test_el_recargo_de_tarjeta_se_recalcula_con_el_nuevo_total(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $plan = PlanPagoTarjeta::create(['nombre' => '3 cuotas', 'cuotas' => 3, 'recargo_porcentaje' => 20, 'orden' => 1, 'is_active' => true]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]], ['plan_pago_tarjeta_id' => $plan->id]);

        // El plan se desactiva después de la compra: la edición usa el snapshot, no el plan vivo.
        $plan->update(['is_active' => false, 'recargo_porcentaje' => 99]);

        $this->editar($pedido, $this->payload($pedido, [['precio_unitario' => 500]]))->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(1000.0, (float) $pedido->total);
        $this->assertSame(200.0, (float) $pedido->recargo_monto);
        $this->assertSame(1200.0, (float) $pedido->total_con_recargo);
    }

    public function test_el_envio_gratis_se_recalcula_con_el_monto_minimo_de_la_compra(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 1500]);
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $this->assertTrue($pedido->envio_gratis);

        // Cambia la configuración global después: no debe afectar a este pedido.
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 99999]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 1]]))->assertSessionHasNoErrors();
        $this->assertFalse($pedido->fresh()->envio_gratis);

        $this->editar($pedido->fresh(), $this->payload($pedido->fresh(), [['cantidad' => 2]]))->assertSessionHasNoErrors();
        $this->assertTrue($pedido->fresh()->envio_gratis);
    }

    public function test_un_pedido_anterior_al_snapshot_no_cambia_su_envio_gratis_al_editarse(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);
        $pedido->update(['envio_gratis' => null, 'envio_gratis_monto_minimo' => null]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 3]]))->assertSessionHasNoErrors();

        $this->assertNull($pedido->fresh()->envio_gratis);
    }

    /* ─── Edición: líneas, validaciones y estados ───────────────────────────── */

    public function test_quitar_una_linea_repone_su_stock_y_recalcula(): void
    {
        $a = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $b = Producto::factory()->create(['precio' => 500, 'stock' => 10]);
        $pedido = $this->comprar([
            ['producto_id' => $a->id, 'cantidad' => 2],
            ['producto_id' => $b->id, 'cantidad' => 3],
        ]);

        $payload = $this->payload($pedido);
        $payload['items'] = [$payload['items'][0]]; // se quita la línea de B

        $this->editar($pedido, $payload)->assertSessionHasNoErrors();

        $this->assertSame(10, $b->fresh()->stock);
        $this->assertSame(8, $a->fresh()->stock);
        $this->assertCount(1, $pedido->fresh()->items);
        $this->assertSame(2000.0, (float) $pedido->fresh()->total);
    }

    public function test_no_se_pueden_quitar_todas_las_lineas(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido);
        $payload['items'] = [];

        $this->editar($pedido, $payload)->assertSessionHasErrors('items');
        $this->assertCount(1, $pedido->fresh()->items);
    }

    public function test_un_item_de_otro_pedido_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);
        $otro = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido);
        $payload['items'][0]['id'] = $otro->items->first()->id;

        $this->editar($pedido, $payload)->assertSessionHasErrors('items');
        $this->assertSame(1000.0, (float) $otro->fresh()->total);
    }

    public function test_una_variante_de_otro_producto_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $otroProducto = Producto::factory()->create();
        $rojo = $this->variante($producto, 'Rojo');
        $ajena = $this->variante($otroProducto, 'Ajena');
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $rojo->id]]);

        $this->editar($pedido, $this->payload($pedido, [['variante_id' => $ajena->id]]))
            ->assertSessionHasErrors('items.0.variante_id');

        $this->assertSame($rojo->id, $pedido->fresh()->items->first()->producto_variante_id);
    }

    public function test_un_pedido_cancelado_no_se_puede_editar(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);
        $pedido->update(['estado' => EstadoPedido::Cancelado]);

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 4]]))->assertSessionHasErrors('estado');
        $this->assertSame(1, $pedido->fresh()->items->first()->cantidad);

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.edit', $pedido))
            ->assertRedirect(route('pedidos.show', $pedido));
    }

    public function test_un_pedido_despachado_se_puede_editar_y_ajusta_el_stock(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 2]]);
        $pedido->update(['estado' => EstadoPedido::Despachado, 'despachado_at' => now()]);

        $this->actingAs(User::factory()->create())->get(route('pedidos.edit', $pedido))->assertOk();

        $this->editar($pedido, $this->payload($pedido, [['cantidad' => 5]]))->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame(EstadoPedido::Despachado, $pedido->estado);
        $this->assertSame(5, $pedido->items->first()->cantidad);
        $this->assertSame(5000.0, (float) $pedido->total);
        $this->assertSame(5, $producto->fresh()->stock);
    }

    /* ─── Sumar productos y combos ──────────────────────────────────────────── */

    public function test_se_puede_sumar_un_producto_al_pedido(): void
    {
        $original = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $nuevo = Producto::factory()->create(['precio' => 500, 'stock' => 10, 'titulo' => 'Pote de humo']);
        $pedido = $this->comprar([['producto_id' => $original->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido);
        $payload['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $nuevo->id, 'cantidad' => 3]];

        $this->editar($pedido, $payload)->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertCount(2, $pedido->items);
        $linea = $pedido->items->firstWhere('producto_id', $nuevo->id);
        $this->assertSame('Pote de humo', $linea->titulo);
        $this->assertSame(3, $linea->cantidad);
        $this->assertSame(500.0, (float) $linea->precio_unitario);
        $this->assertSame(2500.0, (float) $pedido->subtotal);
        $this->assertSame(2500.0, (float) $pedido->total);
        $this->assertSame(7, $nuevo->fresh()->stock);
        $this->assertNotNull($pedido->editado_at);
    }

    public function test_el_precio_de_una_linea_nueva_puede_fijarse_a_mano(): void
    {
        $original = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $nuevo = Producto::factory()->create(['precio' => 500, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $original->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido);
        $payload['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $nuevo->id, 'cantidad' => 2, 'precio_unitario' => 400]];

        $this->editar($pedido, $payload)->assertSessionHasNoErrors();

        $this->assertSame(1800.0, (float) $pedido->fresh()->total);
    }

    public function test_se_puede_cambiar_un_producto_por_otro(): void
    {
        $viejo = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $nuevo = Producto::factory()->create(['precio' => 700, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $viejo->id, 'cantidad' => 2]]);

        $payload = $this->payload($pedido);
        $payload['items'] = [];
        $payload['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $nuevo->id, 'cantidad' => 2]];

        $this->editar($pedido, $payload)->assertSessionHasNoErrors();

        $pedido->refresh();
        $this->assertSame([$nuevo->id], $pedido->items->pluck('producto_id')->all());
        $this->assertSame(1400.0, (float) $pedido->total);
        // El viejo se repone y el nuevo se descuenta.
        $this->assertSame(10, $viejo->fresh()->stock);
        $this->assertSame(8, $nuevo->fresh()->stock);
    }

    public function test_sumar_un_producto_sin_stock_suficiente_rechaza_todo(): void
    {
        $original = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $nuevo = Producto::factory()->create(['precio' => 500, 'stock' => 2]);
        $pedido = $this->comprar([['producto_id' => $original->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido, [['cantidad' => 4]]);
        $payload['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $nuevo->id, 'cantidad' => 3]];

        $this->editar($pedido, $payload)->assertSessionHasErrors('items');

        $pedido->refresh();
        $this->assertCount(1, $pedido->items);
        $this->assertSame(1, $pedido->items->first()->cantidad);
        $this->assertSame(9, $original->fresh()->stock);
        $this->assertSame(2, $nuevo->fresh()->stock);
    }

    public function test_sumar_un_producto_con_colores_exige_elegir_color(): void
    {
        $original = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $conColor = Producto::factory()->create(['precio' => 500]);
        $rojo = $this->variante($conColor, 'Rojo', 100, 5);
        $pedido = $this->comprar([['producto_id' => $original->id, 'cantidad' => 1]]);

        $sinColor = $this->payload($pedido);
        $sinColor['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $conColor->id, 'cantidad' => 1]];
        $this->editar($pedido, $sinColor)->assertSessionHasErrors('nuevos_items');
        $this->assertCount(1, $pedido->fresh()->items);

        $conElColor = $this->payload($pedido);
        $conElColor['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $conColor->id, 'cantidad' => 2, 'variante_id' => $rojo->id]];
        $this->editar($pedido, $conElColor)->assertSessionHasNoErrors();

        $linea = $pedido->fresh()->items->firstWhere('producto_id', $conColor->id);
        $this->assertSame($rojo->id, $linea->producto_variante_id);
        $this->assertSame('Rojo', $linea->variante_nombre);
        $this->assertSame(600.0, (float) $linea->precio_unitario);
        $this->assertSame(3, $rojo->fresh()->stock);
    }

    public function test_no_se_puede_sumar_un_producto_inactivo(): void
    {
        $original = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $inactivo = Producto::factory()->create(['precio' => 500, 'stock' => 10, 'is_active' => false]);
        $pedido = $this->comprar([['producto_id' => $original->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido);
        $payload['nuevos_items'] = [['tipo' => 'producto', 'producto_id' => $inactivo->id, 'cantidad' => 1]];

        $this->editar($pedido, $payload)->assertSessionHasErrors('nuevos_items');
        $this->assertCount(1, $pedido->fresh()->items);
    }

    public function test_se_puede_sumar_un_combo_y_descuenta_sus_componentes(): void
    {
        $original = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $componente = Producto::factory()->create(['precio' => 300, 'stock' => 20]);
        $combo = Combo::create(['titulo' => 'Combo fiesta', 'precio' => 2000, 'is_active' => true, 'envio_gratis' => false]);
        $combo->items()->create(['producto_id' => $componente->id, 'cantidad' => 3, 'orden' => 0]);
        $pedido = $this->comprar([['producto_id' => $original->id, 'cantidad' => 1]]);

        $payload = $this->payload($pedido);
        $payload['nuevos_items'] = [['tipo' => 'combo', 'combo_id' => $combo->id, 'cantidad' => 2]];

        $this->editar($pedido, $payload)->assertSessionHasNoErrors();

        $pedido->refresh();
        $linea = $pedido->items->firstWhere('combo_id', $combo->id);
        $this->assertSame('Combo fiesta', $linea->titulo);
        $this->assertSame(2, $linea->cantidad);
        $this->assertSame(6, $linea->combo_items_seleccionados[0]['cantidad_total']);
        $this->assertSame(5000.0, (float) $pedido->total);
        $this->assertSame(14, $componente->fresh()->stock);
    }

    public function test_la_pantalla_de_edicion_trae_el_catalogo_para_sumar(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        Producto::factory()->create(['is_active' => false]);
        $combo = Combo::create(['titulo' => 'Combo', 'precio' => 2000, 'is_active' => true, 'envio_gratis' => false]);
        $combo->items()->create(['producto_id' => $producto->id, 'cantidad' => 1, 'orden' => 0]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.edit', $pedido))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('productosCatalogo', 1)
                ->has('combosCatalogo', 1)
                ->where('combosCatalogo.0.precio_sugerido', 2000));
    }

    public function test_la_pantalla_de_edicion_carga_las_variantes_del_producto(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $rojo = $this->variante($producto, 'Rojo');
        $this->variante($producto, 'Azul');
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $rojo->id]]);

        $this->actingAs(User::factory()->create())
            ->get(route('pedidos.edit', $pedido))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Pedidos/Edit')
                ->where('pedido.id', $pedido->id)
                ->has("variantesPorProducto.{$producto->id}", 2));
    }

    /* ─── Permisos ──────────────────────────────────────────────────────────── */

    public function test_un_vendedor_puede_editar_pedidos_de_su_sucursal(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]], ['sucursal' => 'cordoba']);
        $vendedor = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        $this->actingAs($vendedor)->get(route('pedidos.edit', $pedido))->assertOk();

        $this->editar($pedido, $this->payload($pedido, [['precio_unitario' => 900]]), $vendedor)
            ->assertSessionHasNoErrors();

        $this->assertSame(900.0, (float) $pedido->fresh()->total);
    }

    public function test_un_vendedor_no_puede_editar_pedidos_de_otra_sucursal(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]], ['sucursal' => 'buenos-aires']);
        $vendedor = User::factory()->vendedor()->create(['sucursal' => Sucursal::Cordoba]);

        $this->actingAs($vendedor)->get(route('pedidos.edit', $pedido))->assertForbidden();

        $this->editar($pedido, $this->payload($pedido, [['precio_unitario' => 1]]), $vendedor)->assertForbidden();
        $this->assertSame(1000.0, (float) $pedido->fresh()->total);
    }

    public function test_un_invitado_no_puede_editar(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $pedido = $this->comprar([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $this->put(route('pedidos.update', $pedido), $this->payload($pedido))->assertRedirect(route('login'));
    }
}
