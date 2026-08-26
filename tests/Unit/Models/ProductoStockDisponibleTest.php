<?php

namespace Tests\Unit\Models;

use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductoStockDisponibleTest extends TestCase
{
    use RefreshDatabase;

    // --- tieneStockDisponible ---

    public function test_producto_sin_variantes_usa_su_propio_stock_como_antes(): void
    {
        $producto = Producto::factory()->create(['stock' => 3]);

        $this->assertTrue($producto->tieneStockDisponible(3));
        $this->assertFalse($producto->tieneStockDisponible(4));
    }

    public function test_producto_con_variantes_ignora_su_propio_stock(): void
    {
        // productos.stock dice 0, pero hay una variante activa con stock de sobra:
        // el producto debe reportarse disponible igual.
        $producto = Producto::factory()->create(['stock' => 0]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Rojo',
            'precio_adicional' => 0,
            'stock' => 10,
            'is_active' => true,
        ]);

        $this->assertTrue($producto->tieneStockDisponible(5));
    }

    public function test_producto_con_variantes_sin_ninguna_con_stock_no_esta_disponible(): void
    {
        $producto = Producto::factory()->create(['stock' => 999]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Rojo',
            'precio_adicional' => 0,
            'stock' => 0,
            'is_active' => true,
        ]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Azul',
            'precio_adicional' => 0,
            'stock' => 2,
            'is_active' => false,
        ]);

        $this->assertFalse($producto->tieneStockDisponible(1));
    }

    public function test_producto_con_variante_activa_ilimitada_siempre_disponible(): void
    {
        $producto = Producto::factory()->create(['stock' => 0]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Rojo',
            'precio_adicional' => 0,
            'stock' => null,
            'is_active' => true,
        ]);

        $this->assertTrue($producto->tieneStockDisponible(999999));
    }

    // --- scopeConStock ---

    public function test_scope_con_stock_sin_variantes_se_comporta_igual_que_antes(): void
    {
        $conStock = Producto::factory()->create(['is_active' => true, 'stock' => 5]);
        $ilimitado = Producto::factory()->create(['is_active' => true, 'stock' => null]);
        $sinStock = Producto::factory()->create(['is_active' => true, 'stock' => 0]);

        $ids = Producto::conStock()->pluck('id');

        $this->assertTrue($ids->contains($conStock->id));
        $this->assertTrue($ids->contains($ilimitado->id));
        $this->assertFalse($ids->contains($sinStock->id));
    }

    public function test_scope_con_stock_incluye_producto_con_variantes_si_alguna_activa_tiene_stock(): void
    {
        $producto = Producto::factory()->create(['is_active' => true, 'stock' => 0]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Rojo',
            'precio_adicional' => 0,
            'stock' => 3,
            'is_active' => true,
        ]);

        $ids = Producto::conStock()->pluck('id');

        $this->assertTrue($ids->contains($producto->id));
    }

    public function test_scope_con_stock_excluye_producto_con_variantes_todas_agotadas_o_inactivas(): void
    {
        $producto = Producto::factory()->create(['is_active' => true, 'stock' => 999]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Rojo',
            'precio_adicional' => 0,
            'stock' => 0,
            'is_active' => true,
        ]);
        ProductoVariante::create([
            'producto_id' => $producto->id,
            'nombre' => 'Azul',
            'precio_adicional' => 0,
            'stock' => 5,
            'is_active' => false,
        ]);

        $ids = Producto::conStock()->pluck('id');

        $this->assertFalse($ids->contains($producto->id));
    }
}
