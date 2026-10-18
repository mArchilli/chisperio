<?php

namespace Tests\Feature\Rukoz;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ContratoPedidoCentral;
use Tests\TestCase;

/** El validador de contrato de los tests, probado contra los ejemplos oficiales del Central 0.1.1 y contra pedidos mal armados. */
class ContratoPedidoCentralTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(string $nombre): array
    {
        return json_decode((string) file_get_contents(base_path("tests/fixtures/rukoz/{$nombre}")), true);
    }

    public function test_acepta_los_ejemplos_oficiales_de_crear_y_editar(): void
    {
        $this->assertSame([], ContratoPedidoCentral::errores($this->fixture('request-pedido-crear.json'), contraCatalogo: false));
        $this->assertSame([], ContratoPedidoCentral::errores($this->fixture('request-pedido-editar.json'), contraCatalogo: false));
    }

    public function test_los_ejemplos_traen_la_nota_de_la_version_0_1_1(): void
    {
        $this->assertSame('Color: Turquesa', $this->fixture('request-pedido-crear.json')['items'][0]['nota']);
    }

    public function test_rechaza_notas_de_mas_de_500_caracteres_y_claves_que_no_existen(): void
    {
        $pedido = $this->fixture('request-pedido-crear.json');
        $pedido['items'][0]['nota'] = str_repeat('x', 501);
        $pedido['sucursal'] = 'cordoba';
        $pedido['items'][0]['color'] = 'rojo';

        $errores = implode(' | ', ContratoPedidoCentral::errores($pedido, contraCatalogo: false));

        $this->assertStringContainsString('items.0.nota', $errores);
        $this->assertStringContainsString('la clave «sucursal» no existe', $errores);
        $this->assertStringContainsString('la clave «color» no existe', $errores);
    }

    public function test_contra_el_catalogo_rechaza_un_producto_con_variantes_pedido_como_producto(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala']);
        ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => 'Roja', 'color_hex' => '#f00', 'precio_adicional' => 0, 'is_active' => true]);

        $pedido = [
            'external_ref' => 'X-1',
            'cliente' => ['nombre' => 'A'],
            'items' => [['tipo' => 'producto', 'id' => (string) $producto->id, 'cantidad' => 1, 'precio_unitario' => 10]],
            'total' => 10,
        ];

        $this->assertStringContainsString('tiene variantes', implode(' ', ContratoPedidoCentral::errores($pedido)));
    }

    public function test_contra_el_catalogo_exige_los_grupos_del_combo_con_las_cantidades_que_pide(): void
    {
        $pistola = Producto::factory()->create(['titulo' => 'Pistola']);
        $roja = ProductoVariante::create(['producto_id' => $pistola->id, 'nombre' => 'Roja', 'color_hex' => '#f00', 'precio_adicional' => 0, 'is_active' => true]);
        $combo = Combo::create(['titulo' => 'Combo', 'precio' => 100, 'is_active' => true]);
        $linea = ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $pistola->id, 'cantidad' => 2, 'orden' => 0]);
        $grupo = "Pistola (#{$linea->id})";

        $pedido = fn (array $selecciones) => [
            'external_ref' => 'X-1',
            'cliente' => ['nombre' => 'A'],
            'total' => 100,
            'items' => [['tipo' => 'combo', 'id' => (string) $combo->id, 'cantidad' => 1, 'precio_unitario' => 100, 'selecciones' => $selecciones]],
        ];
        $opcion = fn (int $cantidad) => ['tipo' => 'variante', 'id' => (string) $roja->id, 'cantidad' => $cantidad];

        $this->assertSame([], ContratoPedidoCentral::errores($pedido([['grupo' => $grupo, 'opciones' => [$opcion(2)]]])));
        $this->assertStringContainsString('suman 1 y el grupo pide 2', implode(' ', ContratoPedidoCentral::errores($pedido([['grupo' => $grupo, 'opciones' => [$opcion(1)]]]))));
        $this->assertStringContainsString('no existe en el catálogo del combo', implode(' ', ContratoPedidoCentral::errores($pedido([['grupo' => 'Otro', 'opciones' => [$opcion(2)]]]))));
    }
}
