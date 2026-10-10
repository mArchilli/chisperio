<?php

namespace Tests\Feature;

use App\Models\Combo;
use App\Models\Producto;
use App\Models\Resena;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResenaTest extends TestCase
{
    use RefreshDatabase;

    private function datos(array $extra = []): array
    {
        return [
            'nombre' => 'María Gómez',
            'meta' => '3 opiniones',
            'texto' => 'Excelente atención.',
            'puntuacion' => 5,
            'fecha' => now()->subDays(3)->toDateString(),
            'color_avatar' => Resena::COLORES[2],
            'is_active' => true,
            ...$extra,
        ];
    }

    /** La migración carga las reseñas históricas; los tests de CRUD arrancan sin ellas. */
    private function sinResenasIniciales(): void
    {
        Resena::query()->delete();
    }

    private function admin(): User
    {
        return User::factory()->create();
    }

    private function vendedor(): User
    {
        return User::factory()->vendedor()->create();
    }

    /* ─── Carga inicial ─────────────────────────────────────────────────────── */

    public function test_las_migraciones_cargan_las_resenas_historicas_y_las_opiniones_adicionales(): void
    {
        $resenas = Resena::recientesPrimero()->get();

        $this->assertCount(76, $resenas);
        $this->assertTrue($resenas->every(fn (Resena $r) => $r->is_active && $r->puntuacion === 5));
        $this->assertTrue($resenas->every(fn (Resena $r) => trim((string) $r->texto) !== ''));

        $adicionales = $resenas->slice(10)->values();
        $this->assertSame('heber abrego', $adicionales->first()->nombre);
        $this->assertSame('Nelson Rubio', $adicionales->last()->nombre);
        $this->assertSame('2026-04-09', $adicionales->first()->fecha->toDateString());
        $this->assertSame('Local Guide · 34 opiniones', $adicionales->firstWhere('nombre', 'Anto Valenzuela')->meta);
        $this->assertSame("Excelente servicio.\nTodo entregado en tiempo y forma.\nSoy de Santiago del estero y los contacte por redes. Super confiables", $adicionales->firstWhere('nombre', 'Eugenia Soriasbernj')->texto);
        $this->assertTrue($adicionales->every(fn (Resena $r) => in_array($r->color_avatar, Resena::COLORES, true)));
        $this->assertStringNotContainsString('(propietario)', $adicionales->pluck('nombre')->implode('\n'));
        $this->assertStringNotContainsString('Foto 1 de la opinión', $adicionales->pluck('texto')->implode('\n'));

        $resenas = $resenas->take(10);
        $this->assertSame(
            ['daniel Morales', 'Sonitus Sonido', 'ale Gutiérrez', 'omar grecco', 'Hernan Kohan', 'Alejandra Ramacciotti', 'Marcelo Alonso', 'Daiana Rocha', 'EDUARDO MARTIN PAIGES', 'Marcos Buet'],
            $resenas->pluck('nombre')->all()
        );
        $this->assertSame(
            ['DM', 'SS', 'AG', 'OG', 'HK', 'AR', 'MA', 'DR', 'EP', 'MB'],
            $resenas->pluck('iniciales')->all()
        );
        $this->assertTrue($resenas->every(fn (Resena $r) => $r->is_active && $r->puntuacion === 5));
        $this->assertSame("Excelente atención, te brindan asesoramiento para hacer la compra correcta, y en 5 día ya tenía el producto.\nRecomiendo al 100%.", $resenas[1]->texto);
    }

    public function test_iniciales_primera_y_ultima_palabra(): void
    {
        $this->assertSame('AR', (new Resena(['nombre' => 'Alejandra Ramacciotti']))->iniciales);
        $this->assertSame('EP', (new Resena(['nombre' => 'EDUARDO MARTIN PAIGES']))->iniciales);
        $this->assertSame('S', (new Resena(['nombre' => 'sonitus']))->iniciales);
        $this->assertSame('ÁM', (new Resena(['nombre' => '  álvaro   molina ']))->iniciales);
    }

    /* ─── Landing ───────────────────────────────────────────────────────────── */

    public function test_la_landing_muestra_solo_las_activas_de_la_mas_nueva_a_la_mas_vieja(): void
    {
        $this->sinResenasIniciales();
        Resena::factory()->create(['nombre' => 'Vieja', 'fecha' => '2026-01-10']);
        Resena::factory()->create(['nombre' => 'Nueva', 'fecha' => '2026-09-01']);
        Resena::factory()->create(['nombre' => 'Oculta', 'fecha' => '2026-09-20', 'is_active' => false]);

        $resenas = $this->get('/')->assertOk()->viewData('page')['props']['resenas'];

        $this->assertSame(['Nueva', 'Vieja'], collect($resenas)->pluck('nombre')->all());
        $this->assertEqualsCanonicalizing(
            ['id', 'nombre', 'meta', 'texto', 'puntuacion', 'fecha', 'color_avatar', 'iniciales'],
            array_keys($resenas[0])
        );
        $this->assertSame('2026-09-01', $resenas[0]['fecha']);
    }

    /* ─── Admin ─────────────────────────────────────────────────────────────── */

    public function test_el_admin_puede_hacer_todo(): void
    {
        $this->sinResenasIniciales();
        $admin = $this->admin();

        $this->actingAs($admin)->get(route('resenas.index'))->assertOk();
        $this->actingAs($admin)->get(route('resenas.create'))->assertOk();

        $this->actingAs($admin)->post(route('resenas.store'), $this->datos())
            ->assertRedirect(route('resenas.index'))->assertSessionHasNoErrors();
        $resena = Resena::firstOrFail();
        $this->assertSame('María Gómez', $resena->nombre);
        $this->assertSame(Resena::COLORES[2], $resena->color_avatar);

        $this->actingAs($admin)->get(route('resenas.edit', $resena))->assertOk();
        $this->actingAs($admin)->put(route('resenas.update', $resena), $this->datos(['nombre' => 'María G.', 'puntuacion' => 4]))
            ->assertRedirect(route('resenas.index'));
        $this->assertSame(4, $resena->fresh()->puntuacion);

        $this->actingAs($admin)->patch(route('resenas.toggle-active', $resena))->assertRedirect();
        $this->assertFalse($resena->fresh()->is_active);

        $this->actingAs($admin)->delete(route('resenas.destroy', $resena))->assertRedirect(route('resenas.index'));
        $this->assertModelMissing($resena);
    }

    /* ─── Vendedor: crear y editar sí, eliminar no ──────────────────────────── */

    public function test_el_vendedor_puede_ver_crear_editar_y_ocultar(): void
    {
        $this->sinResenasIniciales();
        $vendedor = $this->vendedor();

        $this->actingAs($vendedor)->get(route('resenas.index'))->assertOk();
        $this->actingAs($vendedor)->get(route('resenas.create'))->assertOk();

        $this->actingAs($vendedor)->post(route('resenas.store'), $this->datos())
            ->assertRedirect(route('resenas.index'))->assertSessionHasNoErrors();
        $resena = Resena::firstOrFail();

        $this->actingAs($vendedor)->get(route('resenas.edit', $resena))->assertOk();
        $this->actingAs($vendedor)->put(route('resenas.update', $resena), $this->datos(['texto' => 'Texto corregido']))
            ->assertRedirect(route('resenas.index'));
        $this->assertSame('Texto corregido', $resena->fresh()->texto);

        $this->actingAs($vendedor)->patch(route('resenas.toggle-active', $resena))->assertRedirect();
        $this->assertFalse($resena->fresh()->is_active);
    }

    public function test_el_vendedor_no_puede_eliminar_resenas(): void
    {
        $this->sinResenasIniciales();
        $resena = Resena::factory()->create();

        $this->actingAs($this->vendedor())->delete(route('resenas.destroy', $resena))->assertForbidden();

        $this->assertModelExists($resena);
    }

    public function test_un_invitado_no_accede(): void
    {
        $resena = Resena::factory()->create();

        $this->get(route('resenas.index'))->assertRedirect(route('login'));
        $this->post(route('resenas.store'), $this->datos())->assertRedirect(route('login'));
        $this->put(route('resenas.update', $resena), $this->datos())->assertRedirect(route('login'));
        $this->delete(route('resenas.destroy', $resena))->assertRedirect(route('login'));
    }

    /* ─── Validaciones ──────────────────────────────────────────────────────── */

    public function test_validaciones(): void
    {
        $this->sinResenasIniciales();
        $admin = $this->admin();
        $post = fn (array $extra) => $this->actingAs($admin)->post(route('resenas.store'), $this->datos($extra));

        $post(['nombre' => ''])->assertSessionHasErrors('nombre');
        $post(['puntuacion' => 0])->assertSessionHasErrors('puntuacion');
        $post(['puntuacion' => 6])->assertSessionHasErrors('puntuacion');
        $post(['fecha' => now()->addDay()->toDateString()])->assertSessionHasErrors('fecha');
        $post(['fecha' => ''])->assertSessionHasErrors('fecha');
        $post(['color_avatar' => '#123456'])->assertSessionHasErrors('color_avatar');
        $post(['texto' => str_repeat('a', 2001)])->assertSessionHasErrors('texto');

        $this->assertSame(0, Resena::count());
    }

    public function test_el_texto_y_los_datos_del_autor_son_opcionales_y_el_color_se_asigna_solo(): void
    {
        $this->sinResenasIniciales();

        $this->actingAs($this->admin())
            ->post(route('resenas.store'), $this->datos(['texto' => null, 'meta' => null, 'color_avatar' => null]))
            ->assertSessionHasNoErrors();

        $resena = Resena::firstOrFail();
        $this->assertNull($resena->texto);
        $this->assertContains($resena->color_avatar, Resena::COLORES);
    }

    public function test_editar_sin_mandar_color_conserva_el_que_tenia(): void
    {
        $this->sinResenasIniciales();
        $resena = Resena::factory()->create(['color_avatar' => Resena::COLORES[4]]);

        $this->actingAs($this->admin())
            ->put(route('resenas.update', $resena), $this->datos(['color_avatar' => null]))
            ->assertSessionHasNoErrors();

        $this->assertSame(Resena::COLORES[4], $resena->fresh()->color_avatar);
    }
    /* ─── Fichas de producto y de combo ─────────────────────────────────────── */

    public function test_la_ficha_de_producto_muestra_hasta_3_resenas_visibles(): void
    {
        $this->sinResenasIniciales();
        Resena::factory()->count(6)->create();
        Resena::factory()->create(['nombre' => 'Oculta', 'is_active' => false]);
        $producto = Producto::factory()->create(['is_active' => true]);

        $resenas = $this->get(route('tienda.show', $producto))->assertOk()->viewData('page')['props']['resenas'];

        $this->assertCount(3, $resenas);
        $this->assertNotContains('Oculta', collect($resenas)->pluck('nombre')->all());
        $this->assertEqualsCanonicalizing(
            ['id', 'nombre', 'meta', 'texto', 'puntuacion', 'fecha', 'color_avatar', 'iniciales'],
            array_keys($resenas[0])
        );
    }

    public function test_la_ficha_de_combo_tambien_trae_resenas(): void
    {
        $this->sinResenasIniciales();
        Resena::factory()->count(2)->create();
        $combo = Combo::create(['titulo' => 'Combo Fiesta', 'precio' => 1000, 'is_active' => true]);

        $resenas = $this->get(route('combos.show', $combo))->assertOk()->viewData('page')['props']['resenas'];

        $this->assertCount(2, $resenas);
    }

    public function test_sin_resenas_visibles_la_ficha_manda_una_lista_vacia(): void
    {
        $this->sinResenasIniciales();
        Resena::factory()->create(['is_active' => false]);
        $producto = Producto::factory()->create(['is_active' => true]);

        $this->assertSame([], $this->get(route('tienda.show', $producto))->viewData('page')['props']['resenas']);
    }

    public function test_las_resenas_de_la_ficha_cambian_entre_visitas(): void
    {
        $this->sinResenasIniciales();
        Resena::factory()->count(12)->create();
        $producto = Producto::factory()->create(['is_active' => true]);

        $conjuntos = collect(range(1, 8))->map(
            fn () => collect($this->get(route('tienda.show', $producto))->viewData('page')['props']['resenas'])->pluck('id')->all()
        );

        // 12 reseñas, 3 por visita: la probabilidad de que 8 visitas den siempre el mismo trío en el mismo orden es ínfima.
        $this->assertGreaterThan(1, $conjuntos->map(fn ($ids) => implode(',', $ids))->unique()->count());
    }
}
