<?php

namespace Tests\Feature;

use App\Enums\TipoDescuento;
use App\Models\Addon;
use App\Models\CodigoDescuento;
use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\ConfiguracionEnvio;
use App\Models\EscalaPrecio;
use App\Models\MovimientoStock;
use App\Models\Oferta;
use App\Models\Pedido;
use App\Models\PlanPagoTarjeta;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Tests de CARACTERIZACIÓN del checkout (POST /checkout): fijan, con valores literales
 * calculados a mano, qué escribe hoy el checkout para varios carritos reales (escalas
 * sumando colores, oferta + variante con recargo + add-on, color "a elección", combo fijo,
 * combo mixto, cupones, plan de tarjeta, envío gratis, rollbacks).
 *
 * Existen para poder refactorizar el cálculo del pedido (CalculadoraPedido) sin cambiar
 * el comportamiento: se escribieron ANTES del refactor, contra el PedidoController::store
 * original, y tienen que seguir dando exactamente lo mismo después. Si alguno falla
 * después de tocar el checkout, el que se movió es el comportamiento, no el test.
 */
class CheckoutCaracterizacionTest extends TestCase
{
    use RefreshDatabase;

    private function checkout(array $items = [], array $combos = [], array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/checkout', array_merge([
            'cliente_nombre' => 'Cliente de prueba',
            'items' => $items,
            'combos' => $combos,
        ], $extra));
    }

    private function variante(Producto $producto, string $nombre, float $recargo = 0, ?int $stock = null, bool $personalizada = false): ProductoVariante
    {
        return ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => $nombre,
            'color_hex' => '#123456',
            'es_color_personalizado' => $personalizada,
            'precio_adicional' => $recargo,
            'stock' => $stock,
            'is_active' => true,
        ]);
    }

    /** Resumen de los campos económicos y de snapshot del pedido, en tipos estables. */
    private function resumenPedido(Pedido $pedido): array
    {
        return [
            'subtotal' => (float) $pedido->subtotal,
            'total' => (float) $pedido->total,
            'estado' => $pedido->estado->value,
            'sucursal' => $pedido->sucursal->value,
            'descuento_monto' => (float) $pedido->descuento_monto,
            'codigo_descuento_texto' => $pedido->codigo_descuento_texto,
            'codigo_descuento_tipo' => $pedido->codigo_descuento_tipo?->value,
            'codigo_descuento_valor' => $pedido->codigo_descuento_valor === null ? null : (float) $pedido->codigo_descuento_valor,
            'plan_pago_nombre' => $pedido->plan_pago_nombre,
            'plan_pago_cuotas' => $pedido->plan_pago_cuotas,
            'recargo_porcentaje' => $pedido->recargo_porcentaje === null ? null : (float) $pedido->recargo_porcentaje,
            'recargo_monto' => $pedido->recargo_monto === null ? null : (float) $pedido->recargo_monto,
            'total_con_recargo' => $pedido->total_con_recargo === null ? null : (float) $pedido->total_con_recargo,
            'envio_gratis' => (bool) $pedido->envio_gratis,
            'envio_gratis_monto_minimo' => (float) $pedido->envio_gratis_monto_minimo,
        ];
    }

    /** Una fila por línea del pedido, en orden de creación. */
    private function resumenItems(Pedido $pedido): array
    {
        return $pedido->items()->orderBy('id')->get()->map(fn ($item) => [
            'titulo' => $item->titulo,
            'es_combo' => $item->combo_id !== null,
            'variante' => $item->variante_nombre,
            'cantidad' => $item->cantidad,
            'precio_unitario' => (float) $item->precio_unitario,
            'precio_base_unitario' => $item->precio_base_unitario === null ? null : (float) $item->precio_base_unitario,
            'recargo_variante_unitario' => $item->recargo_variante_unitario === null ? null : (float) $item->recargo_variante_unitario,
            'addons_total_unitario' => $item->addons_total_unitario === null ? null : (float) $item->addons_total_unitario,
            'subtotal' => (float) $item->subtotal,
            'color_personalizado_texto' => $item->color_personalizado_texto,
            'addons' => $item->addons_seleccionados,
            'componentes' => $item->combo_items_seleccionados === null ? null : collect($item->combo_items_seleccionados)->map(fn ($c) => [
                $c['titulo'], $c['variante_nombre'], $c['cantidad_por_combo'], $c['cantidad_total'],
            ])->all(),
            'envio_gratis' => (bool) $item->envio_gratis,
        ])->all();
    }

    public function test_escala_por_cantidad_se_resuelve_sobre_el_total_de_unidades_sumando_colores(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Escalado', 'precio' => 1000]);
        EscalaPrecio::create(['producto_id' => $producto->id, 'cantidad_minima' => 3, 'precio_unitario' => 900]);
        EscalaPrecio::create(['producto_id' => $producto->id, 'cantidad_minima' => 10, 'precio_unitario' => 800]);
        $rojo = $this->variante($producto, 'Rojo', 0, 10);
        $azul = $this->variante($producto, 'Azul', 100, 10);

        $response = $this->checkout([
            ['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $rojo->id],
            ['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $azul->id],
        ]);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(2800.0, (float) $response->json('total'));

        $this->assertSame([
            'subtotal' => 2800.0, 'total' => 2800.0, 'estado' => 'pendiente', 'sucursal' => 'buenos-aires',
            'descuento_monto' => 0.0, 'codigo_descuento_texto' => null, 'codigo_descuento_tipo' => null,
            'codigo_descuento_valor' => null, 'plan_pago_nombre' => null, 'plan_pago_cuotas' => null,
            'recargo_porcentaje' => null, 'recargo_monto' => null, 'total_con_recargo' => null,
            'envio_gratis' => false, 'envio_gratis_monto_minimo' => 0.0,
        ], $this->resumenPedido($pedido));

        // 3 unidades en total => tramo de 900 para las dos líneas (la del azul suma su +100).
        $this->assertSame([
            [
                'titulo' => 'Escalado', 'es_combo' => false, 'variante' => 'Rojo', 'cantidad' => 2,
                'precio_unitario' => 900.0, 'precio_base_unitario' => 900.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 1800.0, 'color_personalizado_texto' => null,
                'addons' => null, 'componentes' => null, 'envio_gratis' => false,
            ],
            [
                'titulo' => 'Escalado', 'es_combo' => false, 'variante' => 'Azul', 'cantidad' => 1,
                'precio_unitario' => 1000.0, 'precio_base_unitario' => 900.0, 'recargo_variante_unitario' => 100.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 1000.0, 'color_personalizado_texto' => null,
                'addons' => null, 'componentes' => null, 'envio_gratis' => false,
            ],
        ], $this->resumenItems($pedido));

        $this->assertSame(8, $rojo->fresh()->stock);
        $this->assertSame(9, $azul->fresh()->stock);
        $this->assertSame(2, MovimientoStock::where('pedido_id', $pedido->id)->count());
    }

    public function test_oferta_variante_con_recargo_addon_cupon_fijo_plan_de_tarjeta_y_envio_gratis_por_monto(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 3000]);

        $producto = Producto::factory()->create(['titulo' => 'Con oferta', 'precio' => 2000]);
        Oferta::factory()->create([
            'producto_id' => $producto->id, 'tipo_descuento' => TipoDescuento::Porcentaje, 'valor_descuento' => 25,
        ]);
        $verde = $this->variante($producto, 'Verde', 200, 5);
        $addon = Addon::create(['nombre' => 'Grabado', 'precio' => 300, 'requiere_texto' => true, 'is_active' => true]);
        $producto->addons()->attach($addon->id, ['orden' => 0]);

        $simple = Producto::factory()->create(['titulo' => 'Simple', 'precio' => 100, 'stock' => 10]);

        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'FIJO500', 'tipo_descuento' => TipoDescuento::Fijo, 'valor_descuento' => 500,
            'limite_usos' => 5, 'usos_actuales' => 1,
        ]);
        $plan = PlanPagoTarjeta::create(['nombre' => '3 cuotas', 'cuotas' => 3, 'recargo_porcentaje' => 10, 'orden' => 0, 'is_active' => true]);

        $response = $this->checkout([
            [
                'producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $verde->id,
                'addons' => [['addon_id' => $addon->id, 'texto_personalizado' => '  Para Ana  ']],
            ],
            ['producto_id' => $simple->id, 'cantidad' => 3],
        ], [], [
            'codigo_descuento' => ' fijo500 ',
            'plan_pago_tarjeta_id' => $plan->id,
            'sucursal' => 'cordoba',
        ]);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));

        $this->assertSame([
            'subtotal' => 4300.0, 'total' => 3800.0, 'estado' => 'pendiente', 'sucursal' => 'cordoba',
            'descuento_monto' => 500.0, 'codigo_descuento_texto' => 'FIJO500', 'codigo_descuento_tipo' => 'fijo',
            'codigo_descuento_valor' => 500.0, 'plan_pago_nombre' => '3 cuotas', 'plan_pago_cuotas' => 3,
            'recargo_porcentaje' => 10.0, 'recargo_monto' => 380.0, 'total_con_recargo' => 4180.0,
            'envio_gratis' => true, 'envio_gratis_monto_minimo' => 3000.0,
        ], $this->resumenPedido($pedido));

        // 2000 -25% = 1500; + 200 de la variante + 300 del add-on = 2000 por unidad.
        $this->assertSame([
            [
                'titulo' => 'Con oferta', 'es_combo' => false, 'variante' => 'Verde', 'cantidad' => 2,
                'precio_unitario' => 2000.0, 'precio_base_unitario' => 1500.0, 'recargo_variante_unitario' => 200.0,
                'addons_total_unitario' => 300.0, 'subtotal' => 4000.0, 'color_personalizado_texto' => null,
                'addons' => [['addon_id' => $addon->id, 'nombre' => 'Grabado', 'precio' => 300, 'texto_personalizado' => 'Para Ana']],
                'componentes' => null, 'envio_gratis' => false,
            ],
            [
                'titulo' => 'Simple', 'es_combo' => false, 'variante' => null, 'cantidad' => 3,
                'precio_unitario' => 100.0, 'precio_base_unitario' => 100.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 300.0, 'color_personalizado_texto' => null,
                'addons' => null, 'componentes' => null, 'envio_gratis' => false,
            ],
        ], $this->resumenItems($pedido));

        $this->assertSame($codigo->id, $pedido->codigo_descuento_id);
        $this->assertSame(2, $codigo->fresh()->usos_actuales);
        $this->assertSame(3, $verde->fresh()->stock);
        $this->assertSame(7, $simple->fresh()->stock);
    }

    public function test_cupon_porcentaje_redondea_el_descuento_a_dos_decimales(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Centavos', 'precio' => 333.33]);
        $codigo = CodigoDescuento::factory()->create([
            'codigo' => 'VERANO15', 'tipo_descuento' => TipoDescuento::Porcentaje, 'valor_descuento' => 15,
        ]);

        $response = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 3]], [], ['codigo_descuento' => 'verano15']);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));

        // 999.99 * 15% = 149.9985 => 150.00
        $this->assertSame(999.99, (float) $pedido->subtotal);
        $this->assertSame(150.0, (float) $pedido->descuento_monto);
        $this->assertSame(849.99, (float) $pedido->total);
        $this->assertSame('porcentaje', $pedido->codigo_descuento_tipo->value);
        $this->assertSame(1, $codigo->fresh()->usos_actuales);
    }

    public function test_variante_a_eleccion_guarda_el_color_escrito_por_el_cliente_y_lo_exige(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'A elección', 'precio' => 800]);
        $this->variante($producto, 'Rojo', 0, 10);
        $otro = $this->variante($producto, 'Otro / a elección del cliente', 0, null, personalizada: true);

        $sinTexto = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1, 'variante_id' => $otro->id]]);
        $sinTexto->assertStatus(422)->assertJsonValidationErrors(['color_personalizado_texto']);
        $this->assertSame(0, Pedido::count());

        $response = $this->checkout([
            ['producto_id' => $producto->id, 'cantidad' => 2, 'variante_id' => $otro->id, 'color_personalizado_texto' => '  Turquesa  '],
        ]);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame([
            [
                'titulo' => 'A elección', 'es_combo' => false, 'variante' => 'Otro / a elección del cliente', 'cantidad' => 2,
                'precio_unitario' => 800.0, 'precio_base_unitario' => 800.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 1600.0, 'color_personalizado_texto' => 'Turquesa',
                'addons' => null, 'componentes' => null, 'envio_gratis' => false,
            ],
        ], $this->resumenItems($pedido));
    }

    public function test_producto_con_variantes_sin_elegir_variante_se_rechaza(): void
    {
        $producto = Producto::factory()->create(['precio' => 800]);
        $this->variante($producto, 'Rojo', 0, 10);

        $response = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]]);

        $response->assertStatus(422)->assertJsonValidationErrors(['variante_id']);
        $this->assertSame(0, Pedido::count());
    }

    public function test_combo_fijo_con_descuento_y_envio_gratis_propio_da_envio_gratis_si_es_lo_unico(): void
    {
        ConfiguracionEnvio::obtener()->update(['monto_minimo' => 5000]);

        $componente = Producto::factory()->create(['titulo' => 'Componente', 'precio' => 999, 'stock' => 20]);
        $combo = Combo::create([
            'titulo' => 'Combo -10%', 'precio' => 1000, 'is_active' => true, 'envio_gratis' => true,
            'tipo_descuento' => TipoDescuento::Porcentaje, 'valor_descuento' => 10, 'descuento_activo' => true,
        ]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $componente->id, 'cantidad' => 2, 'orden' => 0]);

        $response = $this->checkout([], [['combo_id' => $combo->id, 'cantidad' => 3]]);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));

        $this->assertSame([
            'subtotal' => 2700.0, 'total' => 2700.0, 'estado' => 'pendiente', 'sucursal' => 'buenos-aires',
            'descuento_monto' => 0.0, 'codigo_descuento_texto' => null, 'codigo_descuento_tipo' => null,
            'codigo_descuento_valor' => null, 'plan_pago_nombre' => null, 'plan_pago_cuotas' => null,
            'recargo_porcentaje' => null, 'recargo_monto' => null, 'total_con_recargo' => null,
            // Subtotal 2700 < 5000, pero el combo con envío gratis es lo único del pedido.
            'envio_gratis' => true, 'envio_gratis_monto_minimo' => 5000.0,
        ], $this->resumenPedido($pedido));

        $this->assertSame([
            [
                'titulo' => 'Combo -10%', 'es_combo' => true, 'variante' => null, 'cantidad' => 3,
                'precio_unitario' => 900.0, 'precio_base_unitario' => 1000.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 2700.0, 'color_personalizado_texto' => null,
                'addons' => null, 'componentes' => [['Componente', null, 2, 6]], 'envio_gratis' => true,
            ],
        ], $this->resumenItems($pedido));

        $this->assertSame(14, $componente->fresh()->stock);
    }

    public function test_combo_mixto_con_producto_suelto_y_otro_combo_gratis_no_da_envio_gratis_por_combo(): void
    {
        // Combo "mixto": una línea de producto sin variantes, una con variante fija y una
        // donde el comprador elige el color.
        $sinVariantes = Producto::factory()->create(['titulo' => 'Sin variantes', 'precio' => 100, 'stock' => 50]);
        $conFija = Producto::factory()->create(['titulo' => 'Con fija', 'precio' => 700, 'stock' => 99]);
        $dorado = $this->variante($conFija, 'Dorado', 0, 10);
        $aElegir = Producto::factory()->create(['titulo' => 'A elegir', 'precio' => 500]);
        $this->variante($aElegir, 'Rojo', 0, 10);
        $azul = $this->variante($aElegir, 'Azul', 0, 10);

        $mixto = Combo::create(['titulo' => 'Combo mixto', 'precio' => 3000, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $mixto->id, 'producto_id' => $sinVariantes->id, 'cantidad' => 2, 'orden' => 0]);
        ComboProducto::create(['combo_id' => $mixto->id, 'producto_id' => $conFija->id, 'producto_variante_id' => $dorado->id, 'cantidad' => 1, 'orden' => 1]);
        $lineaElegir = ComboProducto::create(['combo_id' => $mixto->id, 'producto_id' => $aElegir->id, 'cantidad' => 1, 'orden' => 2]);

        $componenteGratis = Producto::factory()->create(['titulo' => 'Comp gratis', 'precio' => 10, 'stock' => 20]);
        $gratis = Combo::create(['titulo' => 'Combo gratis', 'precio' => 900, 'is_active' => true, 'envio_gratis' => true]);
        ComboProducto::create(['combo_id' => $gratis->id, 'producto_id' => $componenteGratis->id, 'cantidad' => 2, 'orden' => 0]);

        $response = $this->checkout(
            [['producto_id' => $sinVariantes->id, 'cantidad' => 1]],
            [
                ['combo_id' => $mixto->id, 'cantidad' => 2, 'selecciones' => [['combo_producto_id' => $lineaElegir->id, 'variante_id' => $azul->id]]],
                ['combo_id' => $gratis->id, 'cantidad' => 1],
            ],
        );

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));

        $this->assertSame([
            'subtotal' => 7000.0, 'total' => 7000.0, 'estado' => 'pendiente', 'sucursal' => 'buenos-aires',
            'descuento_monto' => 0.0, 'codigo_descuento_texto' => null, 'codigo_descuento_tipo' => null,
            'codigo_descuento_valor' => null, 'plan_pago_nombre' => null, 'plan_pago_cuotas' => null,
            'recargo_porcentaje' => null, 'recargo_monto' => null, 'total_con_recargo' => null,
            // Hay un producto suelto y un combo sin envío gratis: el beneficio del combo no cuenta.
            'envio_gratis' => false, 'envio_gratis_monto_minimo' => 0.0,
        ], $this->resumenPedido($pedido));

        $this->assertSame([
            [
                'titulo' => 'Sin variantes', 'es_combo' => false, 'variante' => null, 'cantidad' => 1,
                'precio_unitario' => 100.0, 'precio_base_unitario' => 100.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 100.0, 'color_personalizado_texto' => null,
                'addons' => null, 'componentes' => null, 'envio_gratis' => false,
            ],
            [
                'titulo' => 'Combo mixto', 'es_combo' => true, 'variante' => null, 'cantidad' => 2,
                'precio_unitario' => 3000.0, 'precio_base_unitario' => 3000.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 6000.0, 'color_personalizado_texto' => null,
                'addons' => null,
                'componentes' => [['Sin variantes', null, 2, 4], ['Con fija', 'Dorado', 1, 2], ['A elegir', 'Azul', 1, 2]],
                'envio_gratis' => false,
            ],
            [
                'titulo' => 'Combo gratis', 'es_combo' => true, 'variante' => null, 'cantidad' => 1,
                'precio_unitario' => 900.0, 'precio_base_unitario' => 900.0, 'recargo_variante_unitario' => 0.0,
                'addons_total_unitario' => 0.0, 'subtotal' => 900.0, 'color_personalizado_texto' => null,
                'addons' => null, 'componentes' => [['Comp gratis', null, 2, 2]], 'envio_gratis' => true,
            ],
        ], $this->resumenItems($pedido));

        // Stock: sin variantes 50 - (1 suelto + 4 del combo mixto) = 45; fija 10 - 2; elegida 10 - 2.
        $this->assertSame(45, $sinVariantes->fresh()->stock);
        $this->assertSame(8, $dorado->fresh()->stock);
        $this->assertSame(8, $azul->fresh()->stock);
        $this->assertSame(18, $componenteGratis->fresh()->stock);
    }

    public function test_combo_con_linea_de_eleccion_sin_seleccion_se_rechaza_y_no_escribe_nada(): void
    {
        $aElegir = Producto::factory()->create(['precio' => 500, 'stock' => 10]);
        $this->variante($aElegir, 'Rojo', 0, 10);
        $combo = Combo::create(['titulo' => 'Combo a elegir', 'precio' => 1000, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $aElegir->id, 'cantidad' => 1, 'orden' => 0]);

        $response = $this->checkout([], [['combo_id' => $combo->id, 'cantidad' => 1]]);

        $response->assertStatus(422)->assertJsonValidationErrors(['combos']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, MovimientoStock::count());
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function cuponesInvalidos(): array
    {
        return [
            'inexistente' => [null],
            'inactivo' => [['activo' => false]],
            'vencido' => [['vigente_hasta' => '2000-01-01']],
            'sin usos disponibles' => [['limite_usos' => 1, 'usos_actuales' => 1]],
        ];
    }

    #[DataProvider('cuponesInvalidos')]
    public function test_cupon_invalido_en_el_checkout_se_rechaza_y_no_escribe_nada(?array $atributos): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = $atributos === null ? null : CodigoDescuento::factory()->create(['codigo' => 'MALO'] + $atributos);

        $response = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2]], [], ['codigo_descuento' => 'MALO']);

        $response->assertStatus(422)->assertJsonValidationErrors(['codigo_descuento']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, MovimientoStock::count());
        $this->assertSame(10, $producto->fresh()->stock);

        if ($codigo !== null) {
            $this->assertSame($atributos['usos_actuales'] ?? 0, $codigo->fresh()->usos_actuales);
        }
    }

    public function test_plan_de_pago_inactivo_se_rechaza_y_no_consume_el_cupon(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 10]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'BUENO']);
        $plan = PlanPagoTarjeta::create(['nombre' => 'Viejo', 'cuotas' => 6, 'recargo_porcentaje' => 20, 'orden' => 0, 'is_active' => false]);

        $response = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]], [], [
            'codigo_descuento' => 'BUENO', 'plan_pago_tarjeta_id' => $plan->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['plan_pago_tarjeta_id']);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
        $this->assertSame(10, $producto->fresh()->stock);
    }

    public function test_stock_insuficiente_se_rechaza_y_no_consume_el_cupon(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'stock' => 1]);
        $codigo = CodigoDescuento::factory()->create(['codigo' => 'BUENO']);

        $response = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 2]], [], ['codigo_descuento' => 'BUENO']);

        $response->assertStatus(422)->assertJsonValidationErrors(["stock.{$producto->id}"]);
        $this->assertSame(0, Pedido::count());
        $this->assertSame(0, $codigo->fresh()->usos_actuales);
        $this->assertSame(1, $producto->fresh()->stock);
    }

    public function test_cupon_que_descuenta_mas_que_el_subtotal_deja_el_total_en_cero(): void
    {
        $producto = Producto::factory()->create(['precio' => 300]);
        CodigoDescuento::factory()->create(['codigo' => 'GRANDE', 'tipo_descuento' => TipoDescuento::Fijo, 'valor_descuento' => 1000]);

        $response = $this->checkout([['producto_id' => $producto->id, 'cantidad' => 1]], [], ['codigo_descuento' => 'GRANDE']);

        $response->assertCreated();
        $pedido = Pedido::findOrFail($response->json('id'));
        $this->assertSame(300.0, (float) $pedido->descuento_monto);
        $this->assertSame(0.0, (float) $pedido->total);
    }
}
