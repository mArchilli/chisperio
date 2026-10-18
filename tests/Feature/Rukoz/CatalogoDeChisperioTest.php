<?php

namespace Tests\Feature\Rukoz;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Rukoz\CatalogoDeChisperio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ContratoCatalogoCentral;
use Tests\TestCase;

/**
 * El proveedor genera el formato exacto de `POST /catalogo/sync` del Central. Cada caso se compara con el JSON
 * esperado y, además, todo el request armado se valida contra el contrato del Central (ContratoCatalogoCentral).
 */
class CatalogoDeChisperioTest extends TestCase
{
    use RefreshDatabase;

    private function proveedor(): CatalogoDeChisperio
    {
        return new CatalogoDeChisperio;
    }

    private function variante(Producto $producto, string $nombre, array $extra = []): ProductoVariante
    {
        return ProductoVariante::create($extra + [
            'producto_id' => $producto->id, 'nombre' => $nombre, 'color_hex' => '#ff0000',
            'precio_adicional' => 0, 'stock' => null, 'is_active' => true,
        ]);
    }

    private function combo(string $titulo, float $precio, array $atributos = []): Combo
    {
        return Combo::create($atributos + ['titulo' => $titulo, 'precio' => $precio, 'is_active' => true]);
    }

    private function linea(Combo $combo, Producto $producto, int $cantidad, ?ProductoVariante $variante = null, int $orden = 0): ComboProducto
    {
        return ComboProducto::create([
            'combo_id' => $combo->id, 'producto_id' => $producto->id, 'cantidad' => $cantidad,
            'producto_variante_id' => $variante?->id, 'orden' => $orden,
        ]);
    }

    /** Arma el request completo como lo haría el paquete (productos primero, combos después) y lo valida. */
    private function assertContratoValido(): array
    {
        $payload = [
            'completo' => true,
            'productos' => iterator_to_array($this->proveedor()->productos(), false),
            'combos' => iterator_to_array($this->proveedor()->combos(), false),
        ];

        $this->assertSame([], ContratoCatalogoCentral::errores($payload));

        return $payload;
    }

    public function test_producto_simple_es_un_item_producto_con_el_precio_de_lista(): void
    {
        // El stock NULL (ilimitado) se sincroniza igual; el stock nunca viaja.
        $producto = Producto::factory()->create(['titulo' => 'Chispa 15cm', 'precio' => 12000, 'stock' => null, 'is_active' => true]);

        $this->assertSame([
            ['id' => (string) $producto->id, 'nombre' => 'Chispa 15cm', 'sku' => null, 'precio' => 12000.0, 'activo' => true],
        ], iterator_to_array($this->proveedor()->productos(), false));

        $this->assertContratoValido();
    }

    public function test_producto_con_variantes_manda_el_producto_con_cada_variante_y_su_recargo(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'precio' => 5000]);
        $rojo = $this->variante($producto, 'Rojo', ['orden' => 1, 'sku' => ' BEN-ROJO ']);
        $verde = $this->variante($producto, 'Verde', ['orden' => 2, 'precio_adicional' => 500, 'sku' => '']);

        $this->assertSame([[
            'id' => (string) $producto->id, 'nombre' => 'Bengala', 'sku' => null, 'precio' => 5000.0, 'activo' => true,
            'variantes' => [
                ['id' => (string) $rojo->id, 'nombre' => 'Rojo', 'sku' => 'BEN-ROJO', 'precio' => 5000.0, 'activo' => true],
                ['id' => (string) $verde->id, 'nombre' => 'Verde', 'sku' => null, 'precio' => 5500.0, 'activo' => true],
            ],
        ]], iterator_to_array($this->proveedor()->productos(), false));

        $this->assertContratoValido();
    }

    public function test_el_precio_es_el_de_lista_sin_escalas_ni_ofertas(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000]);
        $producto->escalasPrecio()->create(['cantidad_minima' => 10, 'precio_unitario' => 700]);

        $this->assertSame(1000.0, iterator_to_array($this->proveedor()->productos(), false)[0]['precio']);
    }

    public function test_variante_a_eleccion_va_como_variante_normal(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Pistola', 'precio' => 8000]);
        $this->variante($producto, 'Rojo');
        $aEleccion = $this->variante($producto, 'Otro / a elección del cliente', ['es_color_personalizado' => true, 'color_hex' => '#cccccc']);

        $variantes = iterator_to_array($this->proveedor()->productos(), false)[0]['variantes'];
        $enviada = collect($variantes)->firstWhere('id', (string) $aEleccion->id);

        $this->assertSame(
            ['id' => (string) $aEleccion->id, 'nombre' => 'Otro / a elección del cliente', 'sku' => null, 'precio' => 8000.0, 'activo' => true],
            $enviada,
        );
        $this->assertContratoValido();
    }

    public function test_combo_con_todas_las_lineas_fijas_es_tipo_fijo(): void
    {
        $sinVariantes = Producto::factory()->create(['precio' => 100]);
        $conVariantes = Producto::factory()->create(['precio' => 100]);
        $azul = $this->variante($conVariantes, 'Azul');
        $this->variante($conVariantes, 'Rojo');

        $combo = $this->combo('Pack chispas', 30000);
        $this->linea($combo, $sinVariantes, 2, null, 0);
        $this->linea($combo, $conVariantes, 1, $azul, 1);   // variante fijada por el admin: no requiere elección

        $this->assertSame([[
            'id' => (string) $combo->id, 'nombre' => 'Pack chispas', 'precio' => 30000.0, 'activo' => true, 'tipo' => 'fijo',
            'items' => [
                ['tipo' => 'producto', 'id' => (string) $sinVariantes->id, 'cantidad' => 2],
                ['tipo' => 'variante', 'id' => (string) $azul->id, 'cantidad' => 1],
            ],
        ]], iterator_to_array($this->proveedor()->combos(), false));

        $this->assertContratoValido();
    }

    public function test_combo_fijo_suma_las_lineas_repetidas_del_mismo_item(): void
    {
        $producto = Producto::factory()->create();
        $combo = $this->combo('Doble', 1000);
        $this->linea($combo, $producto, 2, null, 0);
        $this->linea($combo, $producto, 3, null, 1);

        $enviado = iterator_to_array($this->proveedor()->combos(), false)[0];

        $this->assertSame([['tipo' => 'producto', 'id' => (string) $producto->id, 'cantidad' => 5]], $enviado['items']);
        $this->assertContratoValido();
    }

    public function test_combo_mixto_es_seleccion_con_un_grupo_por_linea(): void
    {
        $fijo = Producto::factory()->create(['titulo' => 'Chispa 15cm']);
        $conColor = Producto::factory()->create(['titulo' => 'Bengala']);
        $rojo = $this->variante($conColor, 'Rojo', ['orden' => 1]);
        $verde = $this->variante($conColor, 'Verde', ['orden' => 2]);
        $this->variante($conColor, 'Apagado', ['orden' => 3, 'is_active' => false]);   // inactiva: no es opción

        $combo = $this->combo('Pack mixto', 25000);
        $lineaFija = $this->linea($combo, $fijo, 2, null, 0);
        $lineaElige = $this->linea($combo, $conColor, 2, null, 1);

        $this->assertSame([[
            'id' => (string) $combo->id, 'nombre' => 'Pack mixto', 'precio' => 25000.0, 'activo' => true, 'tipo' => 'seleccion',
            'grupos' => [
                [
                    'nombre' => "Chispa 15cm (#{$lineaFija->id})", 'cantidad' => 2,
                    'opciones' => [['tipo' => 'producto', 'id' => (string) $fijo->id]],
                ],
                [
                    'nombre' => "Bengala (#{$lineaElige->id})", 'cantidad' => 2,
                    'opciones' => [
                        ['tipo' => 'variante', 'id' => (string) $rojo->id],
                        ['tipo' => 'variante', 'id' => (string) $verde->id],
                    ],
                ],
            ],
        ]], iterator_to_array($this->proveedor()->combos(), false));

        $this->assertContratoValido();
    }

    public function test_en_un_combo_mixto_la_linea_con_variante_fija_es_un_grupo_de_una_opcion_variante(): void
    {
        $conColor = Producto::factory()->create(['titulo' => 'Bengala']);
        $azul = $this->variante($conColor, 'Azul');
        $otro = Producto::factory()->create(['titulo' => 'Pistola']);
        $this->variante($otro, 'Rojo');

        $combo = $this->combo('Mixto 2', 9000);
        $lineaFija = $this->linea($combo, $conColor, 1, $azul, 0);
        $this->linea($combo, $otro, 1, null, 1);

        $grupos = iterator_to_array($this->proveedor()->combos(), false)[0]['grupos'];

        $this->assertSame(["Bengala (#{$lineaFija->id})", 1, [['tipo' => 'variante', 'id' => (string) $azul->id]]], [
            $grupos[0]['nombre'], $grupos[0]['cantidad'], $grupos[0]['opciones'],
        ]);
        $this->assertContratoValido();
    }

    public function test_el_mismo_producto_en_dos_lineas_de_un_combo_de_seleccion_da_grupos_con_nombre_distinto(): void
    {
        $conColor = Producto::factory()->create(['titulo' => 'Bengala']);
        $this->variante($conColor, 'Rojo');
        $this->variante($conColor, 'Verde');

        $combo = $this->combo('Dos lineas', 9000);
        $this->linea($combo, $conColor, 1, null, 0);
        $this->linea($combo, $conColor, 1, null, 1);

        $nombres = array_column(iterator_to_array($this->proveedor()->combos(), false)[0]['grupos'], 'nombre');

        $this->assertCount(2, array_unique($nombres));
        $this->assertContratoValido();
    }

    public function test_los_inactivos_van_con_activo_false(): void
    {
        $inactivo = Producto::factory()->create(['is_active' => false]);
        $variante = $this->variante($inactivo, 'Rojo', ['is_active' => true]);   // variante activa de un producto inactivo
        $activo = Producto::factory()->create(['is_active' => true]);
        $variante2 = $this->variante($activo, 'Azul', ['is_active' => false]);
        $combo = $this->combo('Combo apagado', 1000, ['is_active' => false]);
        $this->linea($combo, $activo, 1);

        $productos = collect(iterator_to_array($this->proveedor()->productos(), false))->keyBy('id');

        $this->assertFalse($productos[(string) $inactivo->id]['activo']);
        $this->assertFalse(collect($productos[(string) $inactivo->id]['variantes'])->firstWhere('id', (string) $variante->id)['activo']);
        $this->assertTrue($productos[(string) $activo->id]['activo']);
        $this->assertFalse(collect($productos[(string) $activo->id]['variantes'])->firstWhere('id', (string) $variante2->id)['activo']);
        $this->assertFalse(iterator_to_array($this->proveedor()->combos(), false)[0]['activo']);

        $this->assertContratoValido();
    }

    public function test_con_ids_manda_solo_esos(): void
    {
        $a = Producto::factory()->create();
        Producto::factory()->create();
        $combo = $this->combo('Uno', 1);
        $this->linea($combo, $a, 1);
        $this->combo('Otro', 1);

        $this->assertSame([(string) $a->id], array_column(iterator_to_array($this->proveedor()->productos([$a->id]), false), 'id'));
        $this->assertSame([(string) $combo->id], array_column(iterator_to_array($this->proveedor()->combos([$combo->id]), false), 'id'));
    }

    public function test_el_validador_del_contrato_detecta_un_combo_fijo_con_el_mismo_item_repetido(): void
    {
        // Control del propio validador: si no detectara errores, los tests de arriba no probarían nada.
        $errores = ContratoCatalogoCentral::errores([
            'completo' => true,
            'productos' => [['id' => '1', 'nombre' => 'A', 'precio' => 1, 'activo' => true]],
            'combos' => [['id' => '9', 'nombre' => 'C', 'precio' => 1, 'activo' => true, 'tipo' => 'fijo', 'items' => [
                ['tipo' => 'producto', 'id' => '1', 'cantidad' => 1],
                ['tipo' => 'producto', 'id' => '1', 'cantidad' => 1],
                ['tipo' => 'producto', 'id' => '404', 'cantidad' => 1],
            ], 'sobra' => true]],
        ]);

        $this->assertCount(3, $errores);
    }

    public function test_el_formato_coincide_con_el_ejemplo_oficial_del_central(): void
    {
        $fixture = json_decode((string) file_get_contents(base_path('tests/fixtures/rukoz/request-catalogo-sync.json')), true);

        $this->assertSame([], ContratoCatalogoCentral::errores($fixture));
    }

    public function test_el_proveedor_lee_la_base_sin_modificarla(): void
    {
        $producto = Producto::factory()->create();
        $combo = $this->combo('X', 1);
        $this->linea($combo, $producto, 1);

        $antes = [Producto::count(), Combo::count(), ComboProducto::count(), $producto->fresh()->updated_at];
        $this->assertContratoValido();

        $this->assertEquals($antes, [Producto::count(), Combo::count(), ComboProducto::count(), $producto->fresh()->updated_at]);
    }
}
