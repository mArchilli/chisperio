<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Combo;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TiendaCombosListadoTest extends TestCase
{
    use RefreshDatabase;

    private function props(string $query = ''): array
    {
        return $this->get('/tienda'.$query)->assertOk()->viewData('page')['props'];
    }

    private function combo(string $titulo, float $precio = 1000, bool $activo = true): Combo
    {
        return Combo::create(['titulo' => $titulo, 'precio' => $precio, 'is_active' => $activo]);
    }

    public function test_la_vista_general_lista_los_combos_aparte_de_los_productos(): void
    {
        $producto = Producto::factory()->create(['titulo' => 'Bengala', 'is_active' => true, 'stock' => 5]);
        $this->combo('Combo Fiesta');

        $props = $this->props();

        $this->assertSame(['Combo Fiesta'], collect($props['combos'])->pluck('titulo')->all());
        $this->assertSame('combo', $props['combos'][0]['tipo']);
        // Los combos NO se mezclan en la lista paginada de productos.
        $this->assertSame([$producto->id], collect($props['productos']['data'])->pluck('id')->all());
        $this->assertSame(1, $props['productos']['total']);
    }

    public function test_los_combos_respetan_el_orden_y_excluyen_los_inactivos(): void
    {
        $this->combo('Combo Z', 100);
        $this->combo('combo a', 300);
        $this->combo('Combo Oculto', 1, activo: false);

        $titulos = fn (string $q) => collect($this->props($q)['combos'])->pluck('titulo')->all();

        $this->assertSame(['combo a', 'Combo Z'], $titulos(''));
        $this->assertSame(['Combo Z', 'combo a'], $titulos('?orden=precio-asc'));
    }

    public function test_la_busqueda_filtra_tambien_los_combos(): void
    {
        $this->combo('Combo Chispas');
        $this->combo('Combo Humo');

        $this->assertSame(['Combo Humo'], collect($this->props('?q=Humo')['combos'])->pluck('titulo')->all());
        $this->assertSame([], $this->props('?q=inexistente')['combos']);
    }

    public function test_con_filtros_de_producto_no_se_muestran_los_combos(): void
    {
        $this->combo('Combo Fiesta');
        $categoria = Categoria::create(['nombre' => 'Bengalas']);

        $this->assertSame([], $this->props("?categoria={$categoria->id}")['combos']);
        $this->assertSame([], $this->props('?filter=destacados')['combos']);
        $this->assertSame([], $this->props('?filter=ofertas')['combos']);
    }

    public function test_la_pestana_combos_sigue_paginada_y_sin_la_seccion_aparte(): void
    {
        $this->combo('Combo Fiesta');

        $props = $this->props('?filter=combos');

        $this->assertArrayNotHasKey('combos', $props);
        $this->assertSame(['Combo Fiesta'], collect($props['productos']['data'])->pluck('titulo')->all());
    }
}
