<?php

namespace Tests\Feature;

use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pendiente de la 11.2: el admin y el dashboard contaban «sin stock» solo por `productos.stock = 0`. Con el stock del Central
 * las variantes llegan en 0 y el producto (que ignora su propia columna) tiene que figurar sin stock igual.
 */
class SinStockConVariantesTest extends TestCase
{
    use RefreshDatabase;

    /** @param list<int|null|array{0: int|null, 1: bool}> $stocks stock de cada variante; `[stock, activa]` para una inactiva. */
    private function conVariantes(string $titulo, array $stocks): Producto
    {
        $producto = Producto::factory()->create(['titulo' => $titulo, 'stock' => null]);

        foreach ($stocks as $i => $stock) {
            [$valor, $activa] = is_array($stock) ? $stock : [$stock, true];
            ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => "Color {$i}", 'color_hex' => '#123456', 'precio_adicional' => 0, 'stock' => $valor, 'is_active' => $activa]);
        }

        return $producto;
    }

    /** @return array<string, Producto> */
    private function catalogo(): array
    {
        return [
            'simple_cero' => Producto::factory()->create(['titulo' => 'Simple 0', 'stock' => 0]),
            'simple_con_stock' => Producto::factory()->create(['titulo' => 'Simple 5', 'stock' => 5]),
            'simple_ilimitado' => Producto::factory()->create(['titulo' => 'Simple NULL', 'stock' => null]),
            'todas_en_cero' => $this->conVariantes('Todas en 0', [0, 0, 0]),
            'una_con_stock' => $this->conVariantes('Una con stock', [0, 3]),
            'una_ilimitada' => $this->conVariantes('Una ilimitada', [0, null]),
            // La única variante con stock está inactiva: no se puede vender, el producto está sin stock.
            'solo_inactiva_con_stock' => $this->conVariantes('Solo la inactiva tiene', [0, [9, false]]),
        ];
    }

    public function test_el_scope_y_el_metodo_coinciden_con_la_tienda_y_miran_las_variantes(): void
    {
        $productos = $this->catalogo();

        $sinStock = Producto::sinStock()->pluck('titulo')->sort()->values()->all();

        $this->assertSame(['Simple 0', 'Solo la inactiva tiene', 'Todas en 0'], $sinStock);

        foreach ($productos as $producto) {
            $esperado = in_array($producto->titulo, $sinStock, true);

            $this->assertSame($esperado, $producto->fresh()->estaSinStock(), $producto->titulo);
            // Es exactamente lo contrario del scope que usa la tienda para listar.
            $this->assertSame(! $esperado, Producto::conStock()->whereKey($producto->id)->exists(), $producto->titulo);
        }
    }

    public function test_el_dashboard_cuenta_los_productos_sin_stock_incluyendo_variantes(): void
    {
        $this->catalogo();

        $this->actingAs(User::factory()->create())->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.productos_sin_stock_count', 3));
    }

    public function test_el_listado_del_admin_marca_sin_stock_a_los_que_tienen_todas_las_variantes_en_cero(): void
    {
        $this->catalogo();

        $this->actingAs(User::factory()->create())->get(route('productos.index'))
            ->assertInertia(function ($page) {
                $marcas = collect($page->toArray()['props']['productos'])->pluck('sin_stock', 'titulo')->all();

                $this->assertTrue($marcas['Todas en 0']);
                $this->assertTrue($marcas['Simple 0']);
                $this->assertTrue($marcas['Solo la inactiva tiene']);
                $this->assertFalse($marcas['Una con stock']);
                $this->assertFalse($marcas['Una ilimitada']);
                $this->assertFalse($marcas['Simple NULL']);
                $this->assertFalse($marcas['Simple 5']);
            });
    }
}
