<?php

namespace Tests\Feature\Rukoz;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Models\User;
use App\Rukoz\EspejoStock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Rukoz\CoreClient\Eventos\StockActualizado;
use Rukoz\CoreClient\Inbox\RegistroDeInbox;
use Rukoz\CoreClient\Procesamiento\ProcesadorEventos;
use Tests\TestCase;

/**
 * 11.2 — el «Disponible web» del Central se espeja en productos.stock y producto_variantes.stock.
 * Los eventos pasan por el camino real del paquete (inbox → regla de versión → StockActualizado → listener).
 */
class EspejoStockTest extends TestCase
{
    use RefreshDatabase;

    private int $secuencia = 0;

    private function encender(): void
    {
        config([
            'integracion.stock' => true,
            'rukoz.habilitada' => true,
            'rukoz.url' => 'http://central.test',
            'rukoz.api_key' => 'rk_prueba',
            'rukoz.secret' => 'secreto-de-prueba',
            'rukoz.reintentos' => 0,
        ]);

        // Lo mismo que hace AppServiceProvider::boot con INTEGRACION_STOCK (ahí el config se lee al arrancar).
        Event::listen(StockActualizado::class, [EspejoStock::class, 'alActualizarse']);
    }

    private function item(string $tipo, int|string $id, ?int $disponible, array $extra = []): array
    {
        return $extra + [
            'tipo' => $tipo, 'id' => (string) $id, 'disponible' => $disponible, 'a_pedido' => false,
            'vinculado' => true, 'aproximado' => false, 'opciones' => null,
        ];
    }

    /** Entrega un `stock.actualizado` como lo haría el webhook o el feed: lo guarda en el inbox y lo procesa. */
    private function entregar(array $items, int $version): void
    {
        $sobre = [
            'id' => (string) Str::uuid(), 'evento' => 'stock.actualizado', 'secuencia' => ++$this->secuencia,
            'datos' => ['completo' => false, 'version' => $version, 'items' => $items],
        ];

        [$evento] = app(RegistroDeInbox::class)->guardar($sobre, json_encode($sobre), 'webhook');
        app(ProcesadorEventos::class)->procesar([$evento]);
    }

    private function variante(Producto $producto, string $nombre, ?int $stock, bool $activa = true): ProductoVariante
    {
        return ProductoVariante::create([
            'producto_id' => $producto->id, 'nombre' => $nombre, 'color_hex' => '#000000',
            'precio_adicional' => 0, 'stock' => $stock, 'is_active' => $activa,
        ]);
    }

    public function test_un_numero_se_escribe_tal_cual_y_nunca_baja_de_cero(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => null]);
        $b = Producto::factory()->create(['stock' => 7]);
        $v = $this->variante(Producto::factory()->create(), 'Dorada', 9);

        $this->entregar([
            $this->item('producto', $a->id, 12),
            $this->item('producto', $b->id, -4),
            $this->item('variante', $v->id, 3),
        ], 10);

        $this->assertSame(12, $a->fresh()->stock);
        $this->assertSame(0, $b->fresh()->stock);
        $this->assertSame(3, $v->fresh()->stock);
    }

    public function test_a_pedido_o_disponible_null_dejan_el_stock_en_null_ilimitado(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => 5]);
        $v = $this->variante(Producto::factory()->create(), 'Negra', 5);
        $c = Producto::factory()->create(['stock' => 5]);

        $this->entregar([
            $this->item('producto', $a->id, null, ['a_pedido' => true]),
            $this->item('variante', $v->id, 8, ['a_pedido' => true]),
            $this->item('producto', $c->id, null),
        ], 10);

        $this->assertNull($a->fresh()->stock);
        $this->assertNull($v->fresh()->stock);
        $this->assertNull($c->fresh()->stock);
    }

    public function test_un_item_sin_vincular_no_se_toca(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => 4]);

        $this->entregar([$this->item('producto', $a->id, null, ['vinculado' => false])], 10);

        $this->assertSame(4, $a->fresh()->stock);
    }

    public function test_los_combos_y_los_ids_que_no_existen_se_ignoran_sin_romper(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => 1]);

        $this->entregar([
            $this->item('combo', 1, 99),
            $this->item('producto', 987654, 5),
            $this->item('producto', $a->id, 2),
        ], 10);

        $this->assertSame(2, $a->fresh()->stock);
        $this->assertDatabaseCount('combos', 0);
    }

    public function test_un_evento_viejo_que_llega_despues_de_uno_nuevo_no_lo_pisa(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => null]);

        $this->entregar([$this->item('producto', $a->id, 5)], 20);
        $this->entregar([$this->item('producto', $a->id, 99)], 15);   // vieja: llega tarde

        $this->assertSame(5, $a->fresh()->stock);

        $this->entregar([$this->item('producto', $a->id, 8)], 21);

        $this->assertSame(8, $a->fresh()->stock);
    }

    public function test_si_el_cache_ya_tiene_una_version_mas_nueva_el_listener_la_respeta(): void
    {
        // Red extra del listener: aunque le llegue un evento con una versión menor a la de rukoz_stock, no escribe.
        $this->encender();
        $a = Producto::factory()->create(['stock' => 5]);
        $this->entregar([$this->item('producto', $a->id, 5)], 20);

        (new EspejoStock)->alActualizarse(new StockActualizado([$this->item('producto', $a->id, 77, ['version' => 19])], 19));

        $this->assertSame(5, $a->fresh()->stock);
    }

    public function test_es_idempotente_y_no_mueve_updated_at(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => 1, 'updated_at' => '2026-01-01 10:00:00']);

        $this->entregar([$this->item('producto', $a->id, 6)], 10);
        $this->entregar([$this->item('producto', $a->id, 6)], 11);
        $this->entregar([$this->item('producto', $a->id, 6)], 11);

        $a->refresh();
        $this->assertSame(6, $a->stock);
        $this->assertSame('2026-01-01 10:00:00', $a->updated_at->format('Y-m-d H:i:s'));
    }

    public function test_un_articulo_vinculado_a_varios_items_web_los_actualiza_a_todos(): void
    {
        // RKZ-0009 en la PULY Dorada y en la Negra: el Central informa el mismo disponible para las dos variantes.
        $this->encender();
        $puly = Producto::factory()->create(['stock' => null]);
        $dorada = $this->variante($puly, 'Dorada', null);
        $negra = $this->variante($puly, 'Negra', null);

        $this->entregar([$this->item('variante', $dorada->id, 14), $this->item('variante', $negra->id, 14)], 30);
        $this->assertSame([14, 14], [$dorada->fresh()->stock, $negra->fresh()->stock]);

        $this->entregar([$this->item('variante', $dorada->id, 13), $this->item('variante', $negra->id, 13)], 31);
        $this->assertSame([13, 13], [$dorada->fresh()->stock, $negra->fresh()->stock]);
    }

    public function test_con_el_interruptor_apagado_no_se_registra_el_listener_y_no_se_escribe_nada(): void
    {
        $this->assertFalse((bool) config('integracion.stock'));
        $this->assertFalse(Event::hasListeners(StockActualizado::class));

        $a = Producto::factory()->create(['stock' => 3]);
        (new EspejoStock)->alActualizarse(new StockActualizado([$this->item('producto', $a->id, 50)], 5));

        $this->assertSame(3, $a->fresh()->stock);
    }

    public function test_los_combos_no_tienen_columna_y_su_stock_sale_de_los_componentes(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => null]);
        $combo = Combo::create(['titulo' => 'Combo', 'precio' => 100, 'is_active' => true]);
        ComboProducto::create(['combo_id' => $combo->id, 'producto_id' => $a->id, 'cantidad' => 2, 'orden' => 0]);

        $this->entregar([$this->item('producto', $a->id, 5), $this->item('combo', $combo->id, 99)], 10);

        $this->assertSame(2, $combo->fresh()->stockDisponible()); // floor(5 / 2), no el 99 del Central
    }

    // ---- Carga completa ----

    private function fakeStockDelCentral(array $items, int $version = 40): void
    {
        Http::fake(['*/stock*' => Http::response([
            'items' => $items, 'generado_at' => now()->toIso8601String(), 'version' => $version, 'hay_mas' => false, 'siguiente_cursor' => null,
        ])]);
    }

    public function test_la_carga_completa_llena_el_espejo_y_se_puede_repetir(): void
    {
        $this->encender();
        $sinVariantes = Producto::factory()->create(['stock' => null]);
        $aPedido = Producto::factory()->create(['stock' => 3]);
        $sinVincular = Producto::factory()->create(['stock' => 8]);
        $v = $this->variante(Producto::factory()->create(), 'Verde', null);

        $this->fakeStockDelCentral([
            $this->item('producto', $sinVariantes->id, 25),
            $this->item('producto', $aPedido->id, null, ['a_pedido' => true]),
            $this->item('producto', $sinVincular->id, null, ['vinculado' => false]),
            $this->item('variante', $v->id, 0),
        ]);

        $this->artisan('chisperio:stock-cargar')
            ->expectsOutputToContain('Actualizados (el stock local cambió)')
            ->assertSuccessful();

        $this->assertSame(25, $sinVariantes->fresh()->stock);
        $this->assertNull($aPedido->fresh()->stock);
        $this->assertSame(8, $sinVincular->fresh()->stock);
        $this->assertSame(0, $v->fresh()->stock);

        // Segunda corrida: nada cambia (idempotente).
        Artisan::call('chisperio:stock-cargar');
        $salida = Artisan::output();
        $this->assertMatchesRegularExpression('/Actualizados[^\n]*\s0\b/', $salida);
        $this->assertSame(25, $sinVariantes->fresh()->stock);
        $this->assertSame(0, $v->fresh()->stock);
    }

    public function test_la_carga_completa_vuelca_tambien_lo_que_ya_estaba_en_el_cache_aunque_no_cambie(): void
    {
        // rukoz:sync-stock solo avisa lo que cambió en rukoz_stock; si la columna quedó atrás, la carga la corrige igual.
        $this->encender();
        $a = Producto::factory()->create(['stock' => null]);
        $this->entregar([$this->item('producto', $a->id, 9)], 10);
        DB::table('productos')->where('id', $a->id)->update(['stock' => 2]); // el checkout local lo descontó

        $this->fakeStockDelCentral([$this->item('producto', $a->id, 9)], 10);
        $this->artisan('chisperio:stock-cargar')->assertSuccessful();

        $this->assertSame(9, $a->fresh()->stock);
    }

    public function test_la_carga_completa_con_el_interruptor_apagado_avisa_y_falla(): void
    {
        $this->artisan('chisperio:stock-cargar')->assertFailed();
    }

    public function test_la_carga_completa_no_toca_nada_si_el_central_no_responde(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => 4]);
        Http::fake(fn () => Http::response(['error' => ['codigo' => 'X']], 500));

        $this->artisan('chisperio:stock-cargar')->assertFailed();

        $this->assertSame(4, $a->fresh()->stock);
    }

    // ---- chisperio:stock-sin-espejo ----

    public function test_sin_espejo_lista_los_activos_sin_fila_y_sale_con_error(): void
    {
        $this->encender();
        $sinFila = Producto::factory()->create(['titulo' => 'Sin fila', 'stock' => null]);
        Producto::factory()->create(['titulo' => 'Inactivo', 'stock' => null, 'is_active' => false]);

        $this->artisan('chisperio:stock-sin-espejo')
            ->expectsOutputToContain('sin fila en rukoz_stock')
            ->assertFailed();

        $this->entregar([$this->item('producto', $sinFila->id, 3)], 10);
        $this->artisan('chisperio:stock-sin-espejo')->assertSuccessful();
    }

    public function test_sin_espejo_detecta_el_stock_local_que_difiere_y_vuelve_a_cero_tras_la_carga(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => null]);
        $this->entregar([$this->item('producto', $a->id, 5)], 10);
        DB::table('productos')->where('id', $a->id)->update(['stock' => 4]);

        $this->artisan('chisperio:stock-sin-espejo')
            ->expectsOutputToContain('el stock local difiere del espejo')
            ->assertFailed();

        $this->artisan('chisperio:stock-cargar', ['--local' => true])->assertSuccessful();
        $this->artisan('chisperio:stock-sin-espejo')->assertSuccessful();
    }

    public function test_sin_espejo_revisa_las_variantes_y_no_el_producto_que_las_tiene(): void
    {
        $this->encender();
        $padre = Producto::factory()->create(['stock' => null]);
        $dorada = $this->variante($padre, 'Dorada', null);
        $this->variante($padre, 'Vieja', null, activa: false);

        // El producto con variantes no tiene fila propia y no cuenta; la variante inactiva tampoco.
        $this->artisan('chisperio:stock-sin-espejo')->assertFailed();

        $this->entregar([$this->item('variante', $dorada->id, 1)], 10);
        $this->artisan('chisperio:stock-sin-espejo')->assertSuccessful();
    }

    public function test_sin_espejo_no_marca_error_a_los_items_sin_vincular_en_el_central(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => 6]);
        $this->entregar([$this->item('producto', $a->id, null, ['vinculado' => false])], 10);

        $this->artisan('chisperio:stock-sin-espejo')->assertSuccessful();
    }

    // ---- Admin: el stock pasa a ser de solo lectura ----

    public function test_el_admin_marca_como_gestionado_solo_lo_que_el_central_vincula(): void
    {
        $this->encender();
        $vinculado = Producto::factory()->create(['stock' => null]);
        $sinVincular = Producto::factory()->create(['stock' => 2]);
        $this->entregar([
            $this->item('producto', $vinculado->id, 5),
            $this->item('producto', $sinVincular->id, null, ['vinculado' => false]),
        ], 10);

        $props = fn (Producto $p) => $this->actingAs(User::factory()->create())
            ->get(route('productos.edit', $p))->assertOk()->viewData('page')['props']['producto'];

        $this->assertTrue($props($vinculado)['stock_gestionado']);
        $this->assertFalse($props($sinVincular)['stock_gestionado']);
    }

    public function test_con_el_interruptor_apagado_el_admin_no_marca_nada_y_edita_el_stock_como_siempre(): void
    {
        $a = Producto::factory()->create(['stock' => 5]);

        $producto = $this->actingAs(User::factory()->create())
            ->get(route('productos.edit', $a))->assertOk()->viewData('page')['props']['producto'];
        $this->assertFalse($producto['stock_gestionado']);

        $this->put(route('productos.update', $a->id), ['titulo' => $a->titulo, 'precio' => $a->precio, 'stock' => 12])->assertRedirect();
        $this->assertSame(12, $a->fresh()->stock);
    }

    public function test_el_backend_ignora_el_stock_de_un_producto_gestionado_pero_guarda_el_resto(): void
    {
        $this->encender();
        $a = Producto::factory()->create(['stock' => null, 'titulo' => 'Antes']);
        $this->entregar([$this->item('producto', $a->id, 5)], 10);

        $this->actingAs(User::factory()->create())
            ->put(route('productos.update', $a->id), ['titulo' => 'Después', 'precio' => 777, 'stock' => 999])
            ->assertRedirect(route('productos.index'))
            ->assertSessionHasNoErrors();

        $a->refresh();
        $this->assertSame(5, $a->stock);
        $this->assertSame('Después', $a->titulo);
        $this->assertEquals(777, $a->precio);

        // «Vaciar» el campo (ilimitado) tampoco pisa el espejo.
        $this->put(route('productos.update', $a->id), ['titulo' => 'Después', 'precio' => 777, 'stock' => null])->assertRedirect();
        $this->assertSame(5, $a->fresh()->stock);
    }

    public function test_el_backend_ignora_el_stock_de_las_variantes_gestionadas_y_acepta_el_de_las_otras(): void
    {
        $this->encender();
        $p = Producto::factory()->create(['stock' => null]);
        $gestionada = $this->variante($p, 'Dorada', null);
        $local = $this->variante($p, 'Local', 3);
        $this->entregar([$this->item('variante', $gestionada->id, 6)], 10);

        $this->actingAs(User::factory()->create())->put(route('productos.update', $p->id), [
            'titulo' => $p->titulo, 'precio' => $p->precio,
            'variantes' => [
                ['id' => $gestionada->id, 'nombre' => 'Dorada Plus', 'stock' => 500, 'is_active' => true, 'clave' => (string) $gestionada->id],
                ['id' => $local->id, 'nombre' => 'Local', 'stock' => 40, 'is_active' => true, 'clave' => (string) $local->id],
                ['nombre' => 'Nueva', 'stock' => 11, 'is_active' => true, 'clave' => 'nueva-1'],
            ],
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame(6, $gestionada->fresh()->stock);
        $this->assertSame('Dorada Plus', $gestionada->fresh()->nombre);
        $this->assertSame(40, $local->fresh()->stock);
        $this->assertSame(11, ProductoVariante::where('nombre', 'Nueva')->value('stock'));

        $props = $this->get(route('productos.edit', $p))->viewData('page')['props']['producto'];
        $porNombre = collect($props['variantes'])->keyBy('nombre');
        $this->assertTrue($porNombre['Dorada Plus']['stock_gestionado']);
        $this->assertFalse($porNombre['Local']['stock_gestionado']);
        $this->assertFalse($porNombre['Nueva']['stock_gestionado']);
    }
}
