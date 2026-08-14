<?php

namespace Tests\Feature;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ShowProductoPricingTest extends TestCase
{
    use RefreshDatabase;

    public function test_ficha_de_producto_expone_escalas_precio_ordenadas_y_precio_actual(): void
    {
        $producto = Producto::factory()->create(['precio' => 1000, 'is_active' => true]);
        $escalaAlta = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 50,
            'precio_unitario' => 700,
        ]);
        $escalaBaja = EscalaPrecio::factory()->create([
            'producto_id' => $producto->id,
            'cantidad_minima' => 10,
            'precio_unitario' => 800,
        ]);
        Oferta::factory()->create([
            'producto_id' => $producto->id,
            'alcance' => AlcanceOferta::Todos,
            'tipo_descuento' => TipoDescuento::Porcentaje,
            'valor_descuento' => 20,
        ]);

        $this->get("/tienda/{$producto->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ShowProduct')
                // Contrato existente: no se rompe, solo se agrega.
                ->where('producto.id', $producto->id)
                ->has('producto.imagen_principal')
                ->has('producto.oferta_vigente')
                ->has('producto.categorias')
                ->has('producto.subcategorias')
                // Campos nuevos de la Fase 3.
                ->has('producto.escalas_precio', 2)
                ->where('producto.escalas_precio.0.id', $escalaBaja->id)
                ->where('producto.escalas_precio.0.cantidad_minima', 10)
                ->where('producto.escalas_precio.0.precio_unitario', 800)
                ->where('producto.escalas_precio.1.id', $escalaAlta->id)
                ->where('producto.escalas_precio.1.cantidad_minima', 50)
                ->where('producto.precio_actual.precio_lista', 1000)
                ->where('producto.precio_actual.precio_unitario_final', 800)
                ->where('producto.precio_actual.ahorro_porcentaje', 20)
                ->where('producto.precio_actual.oferta_aplicada', true)
            );
    }
}
