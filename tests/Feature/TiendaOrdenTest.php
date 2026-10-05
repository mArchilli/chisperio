<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TiendaOrdenTest extends TestCase
{
    use RefreshDatabase;

    private function titulos(string $query = ''): array
    {
        $respuesta = $this->get('/tienda'.$query)->assertOk();

        return collect($respuesta->viewData('page')['props']['productos']['data'])->pluck('titulo')->all();
    }

    private function crear(string $titulo, float $precio, array $extra = []): Producto
    {
        return Producto::factory()->create(['titulo' => $titulo, 'precio' => $precio, 'is_active' => true, 'stock' => 10, ...$extra]);
    }

    public function test_por_defecto_ordena_de_la_a_a_la_z(): void
    {
        $this->crear('Pistola', 300);
        $this->crear('bengala', 100);
        $this->crear('Antorcha', 200);

        $this->assertSame(['Antorcha', 'bengala', 'Pistola'], $this->titulos());
    }

    public function test_orden_z_a(): void
    {
        $this->crear('Pistola', 300);
        $this->crear('Bengala', 100);
        $this->crear('Antorcha', 200);

        $this->assertSame(['Pistola', 'Bengala', 'Antorcha'], $this->titulos('?orden=za'));
    }

    public function test_orden_por_precio_ascendente_y_descendente(): void
    {
        $this->crear('B', 300);
        $this->crear('A', 100);
        $this->crear('C', 200);

        $this->assertSame(['A', 'C', 'B'], $this->titulos('?orden=precio-asc'));
        $this->assertSame(['B', 'C', 'A'], $this->titulos('?orden=precio-desc'));
    }

    public function test_con_el_mismo_precio_desempata_por_titulo(): void
    {
        $this->crear('Zeta', 100);
        $this->crear('Alfa', 100);

        $this->assertSame(['Alfa', 'Zeta'], $this->titulos('?orden=precio-asc'));
        $this->assertSame(['Alfa', 'Zeta'], $this->titulos('?orden=precio-desc'));
    }

    public function test_los_productos_sin_stock_siguen_al_final_con_cualquier_orden(): void
    {
        $this->crear('Agotado', 50, ['stock' => 0]);
        $this->crear('Beta', 300);
        $this->crear('Alfa', 100);

        $this->assertSame(['Alfa', 'Beta', 'Agotado'], $this->titulos());
        $this->assertSame(['Beta', 'Alfa', 'Agotado'], $this->titulos('?orden=precio-desc'));
        $this->assertSame(['Alfa', 'Beta', 'Agotado'], $this->titulos('?orden=precio-asc'));
    }

    public function test_un_orden_invalido_cae_en_a_z(): void
    {
        $this->crear('B', 1);
        $this->crear('A', 2);

        $this->assertSame(['A', 'B'], $this->titulos('?orden=cualquier-cosa'));
    }

    public function test_el_orden_se_combina_con_los_filtros(): void
    {
        $this->crear('Chispa Z', 10, ['is_featured' => true]);
        $this->crear('Chispa A', 20, ['is_featured' => true]);
        $this->crear('Otro', 5);

        $this->assertSame(['Chispa A', 'Chispa Z'], $this->titulos('?filter=destacados'));
        $this->assertSame(['Chispa Z', 'Chispa A'], $this->titulos('?filter=destacados&orden=precio-asc'));
        $this->assertSame(['Chispa A', 'Chispa Z'], $this->titulos('?q=Chispa'));
    }

    public function test_la_paginacion_mantiene_el_orden_entre_tandas(): void
    {
        foreach (range(1, 30) as $i) {
            $this->crear(sprintf('Producto %02d', $i), 100); // mismo precio: desempata título
        }

        $primera = $this->titulos('?orden=precio-asc');
        $segunda = $this->titulos('?orden=precio-asc&page=2');

        $this->assertCount(24, $primera);
        $this->assertCount(6, $segunda);
        $this->assertSame(array_map(fn ($i) => sprintf('Producto %02d', $i), range(1, 30)), [...$primera, ...$segunda]);
    }

    public function test_el_orden_activo_vuelve_en_los_filtros(): void
    {
        $this->crear('A', 1);

        $props = $this->get('/tienda?orden=precio-desc')->viewData('page')['props'];
        $this->assertSame('precio-desc', $props['filters']['orden']);

        $props = $this->get('/tienda')->viewData('page')['props'];
        $this->assertSame('az', $props['filters']['orden']);
    }

    public function test_los_combos_tambien_se_ordenan(): void
    {
        Combo::create(['titulo' => 'Combo Z', 'precio' => 100, 'is_active' => true]);
        Combo::create(['titulo' => 'Combo A', 'precio' => 300, 'is_active' => true]);

        $titulos = fn (string $q) => collect($this->get('/tienda?filter=combos'.$q)->viewData('page')['props']['productos']['data'])->pluck('titulo')->all();

        $this->assertSame(['Combo A', 'Combo Z'], $titulos(''));
        $this->assertSame(['Combo Z', 'Combo A'], $titulos('&orden=precio-asc'));
    }
    public function test_el_listado_trae_los_colores_activos_con_su_foto_propia(): void
    {
        $producto = $this->crear('Chispa', 100);
        $rojo = ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => 'Rojo', 'color_hex' => '#ff0000', 'precio_adicional' => 50, 'stock' => 5, 'is_active' => true, 'orden' => 1]);
        $azul = ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => 'Azul', 'color_hex' => '#0000ff', 'precio_adicional' => 0, 'stock' => 5, 'is_active' => true, 'orden' => 2]);
        ProductoVariante::create(['producto_id' => $producto->id, 'nombre' => 'Oculto', 'color_hex' => '#000000', 'precio_adicional' => 0, 'stock' => 5, 'is_active' => false, 'orden' => 3]);

        $producto->media()->create(['tipo' => 'imagen', 'ruta' => 'img/general.jpg', 'orden' => 0, 'is_principal' => true]);
        $producto->media()->create(['tipo' => 'imagen', 'ruta' => 'img/rojo.jpg', 'orden' => 0, 'producto_variante_id' => $rojo->id]);
        $producto->media()->create(['tipo' => 'video', 'ruta' => 'vid/rojo.mp4', 'orden' => 1, 'producto_variante_id' => $rojo->id]);

        $item = $this->get('/tienda')->viewData('page')['props']['productos']['data'][0];

        $this->assertSame(['Rojo', 'Azul'], collect($item['variantes_activas'])->pluck('nombre')->all());
        $this->assertTrue($item['tiene_variantes']);

        $porNombre = collect($item['variantes_activas'])->keyBy('nombre');
        $this->assertSame(['img/rojo.jpg'], collect($porNombre['Rojo']['media_especifica'])->pluck('ruta')->all()); // solo imágenes
        $this->assertSame([], $porNombre['Azul']['media_especifica']); // sin foto propia: la card queda con la principal
        $this->assertSame('img/general.jpg', $item['imagen_principal']['ruta']);
    }
}
