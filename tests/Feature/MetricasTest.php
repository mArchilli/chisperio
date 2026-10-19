<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\Sucursal;
use App\Models\Pedido;
use App\Models\User;
use App\Support\ZonaHoraria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Métricas del panel: ventas (despachados) separadas de pendientes, cancelados fuera, y los
 * días/meses interpretados en hora argentina sobre fechas guardadas en UTC.
 */
class MetricasTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Crea un pedido con un ítem y le fija created_at (en UTC, como se guarda). */
    private function pedido(EstadoPedido $estado, float $total, string $creadoUtc, string $titulo = 'Producto', Sucursal $sucursal = Sucursal::BuenosAires): Pedido
    {
        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente',
            'subtotal' => $total,
            'total' => $total,
            'estado' => $estado,
            'sucursal' => $sucursal,
        ]);
        $pedido->items()->create([
            'titulo' => $titulo,
            'precio_unitario' => $total,
            'cantidad' => 1,
            'subtotal' => $total,
        ]);

        DB::table('pedidos')->where('id', $pedido->id)->update(['created_at' => $creadoUtc, 'updated_at' => $creadoUtc]);

        return $pedido;
    }

    private function metricas(array $query)
    {
        return $this->actingAs(User::factory()->create())->get(route('metricas.index', $query));
    }

    public function test_la_facturacion_cuenta_solo_ventas_y_los_pendientes_van_aparte(): void
    {
        $this->pedido(EstadoPedido::Despachado, 1000, '2026-10-10 15:00:00');
        $this->pedido(EstadoPedido::Despachado, 3000, '2026-10-11 15:00:00');
        $this->pedido(EstadoPedido::Pendiente, 500, '2026-10-12 15:00:00');
        $this->pedido(EstadoPedido::Pendiente, 250, '2026-10-13 15:00:00');
        $this->pedido(EstadoPedido::Cancelado, 9999, '2026-10-14 15:00:00');

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Metricas/Index')
                ->where('stats.facturacion_total', 4000)
                ->where('stats.cantidad_pedidos', 2)
                ->where('stats.ticket_promedio', 2000)
                ->where('stats.pendientes.monto', 750)
                ->where('stats.pendientes.cantidad', 2)
            );
    }

    public function test_cancelados_no_suman_nunca_ni_a_ventas_ni_a_pendientes(): void
    {
        $this->pedido(EstadoPedido::Cancelado, 5000, '2026-10-10 15:00:00');

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 0)
                ->where('stats.cantidad_pedidos', 0)
                ->where('stats.ticket_promedio', 0)
                ->where('stats.pendientes.monto', 0)
                ->where('stats.pendientes.cantidad', 0)
                ->where('stats.top_productos', [])
            );
    }

    public function test_top_de_productos_y_comparacion_con_el_mes_anterior_usan_solo_ventas(): void
    {
        $this->pedido(EstadoPedido::Despachado, 1000, '2026-10-10 15:00:00', 'Vendido');
        $this->pedido(EstadoPedido::Pendiente, 8000, '2026-10-10 15:00:00', 'Solo reservado');
        $this->pedido(EstadoPedido::Despachado, 500, '2026-09-10 15:00:00', 'Mes anterior');
        $this->pedido(EstadoPedido::Pendiente, 7000, '2026-09-10 15:00:00', 'Reservado mes anterior');

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.top_productos', [['nombre' => 'Vendido', 'monto' => 1000]])
                ->where('stats.comparacion_periodo_anterior.facturacion', 500)
                ->where('stats.comparacion_periodo_anterior.variacion_pct', 100)
            );
    }

    public function test_borde_de_medianoche_argentina_en_el_filtro_por_dia(): void
    {
        // 18/10 en Argentina = de 2026-10-18 03:00:00 UTC a 2026-10-19 02:59:59 UTC.
        $this->pedido(EstadoPedido::Despachado, 100, '2026-10-18 02:59:59'); // 17/10 23:59:59 ART
        $this->pedido(EstadoPedido::Despachado, 200, '2026-10-18 03:00:00'); // 18/10 00:00:00 ART
        $this->pedido(EstadoPedido::Despachado, 400, '2026-10-19 02:59:59'); // 18/10 23:59:59 ART
        $this->pedido(EstadoPedido::Despachado, 800, '2026-10-19 03:00:00'); // 19/10 00:00:00 ART

        $this->metricas(['periodo' => 'diario', 'fecha' => '2026-10-18'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 600)
                ->where('stats.cantidad_pedidos', 2)
                // La hora de la serie también es argentina: 00:00 y 23:00.
                ->where('stats.facturacion_serie.0', ['hora' => 0, 'total' => 200])
                ->where('stats.facturacion_serie.23', ['hora' => 23, 'total' => 400])
                ->where('stats.comparacion_periodo_anterior.facturacion', 100)
            );

        $this->metricas(['periodo' => 'diario', 'fecha' => '2026-10-19'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 800));
    }

    public function test_borde_de_medianoche_argentina_en_el_filtro_por_mes(): void
    {
        // Octubre argentino = de 2026-10-01 03:00:00 UTC a 2026-11-01 02:59:59 UTC.
        $this->pedido(EstadoPedido::Despachado, 1, '2026-10-01 02:59:59'); // 30/09 23:59:59 ART
        $this->pedido(EstadoPedido::Despachado, 10, '2026-10-01 03:00:00'); // 01/10 00:00:00 ART
        $this->pedido(EstadoPedido::Despachado, 100, '2026-11-01 02:59:59'); // 31/10 23:59:59 ART
        $this->pedido(EstadoPedido::Despachado, 1000, '2026-11-01 03:00:00'); // 01/11 00:00:00 ART

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 110)
                ->where('stats.cantidad_pedidos', 2)
                // La venta de las 23:59 del 31/10 ART se anota el día 31 y no el 1/11 de UTC.
                ->where('stats.facturacion_serie.0.total', 10)
                ->where('stats.facturacion_serie.30.fecha', '2026-10-31')
                ->where('stats.facturacion_serie.30.total', 100)
                ->has('stats.facturacion_serie', 31)
            );
    }

    public function test_sin_fecha_el_periodo_por_defecto_es_hoy_en_hora_argentina(): void
    {
        // 2026-11-01 01:00 UTC todavía es 31/10 22:00 en Argentina.
        Carbon::setTestNow('2026-11-01 01:00:00');

        $this->metricas(['periodo' => 'diario'])
            ->assertInertia(fn ($page) => $page->where('fecha', '2026-10-31'));
    }

    public function test_dashboard_agrupa_pedidos_por_dia_argentino(): void
    {
        Carbon::setTestNow('2026-10-20 15:00:00'); // 12:00 ART

        $this->pedido(EstadoPedido::Pendiente, 1, '2026-10-19 02:30:00'); // 18/10 23:30 ART
        $this->pedido(EstadoPedido::Pendiente, 1, '2026-10-19 03:30:00'); // 19/10 00:30 ART

        $this->actingAs(User::factory()->create())->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->has('stats.pedidos_por_dia', 30)
                ->where('stats.pedidos_por_dia.29.fecha', '2026-10-20')
                ->where('stats.pedidos_por_dia.29.cantidad', 0)
                ->where('stats.pedidos_por_dia.28.fecha', '2026-10-19')
                ->where('stats.pedidos_por_dia.28.cantidad', 1)
                ->where('stats.pedidos_por_dia.27.fecha', '2026-10-18')
                ->where('stats.pedidos_por_dia.27.cantidad', 1)
            );
    }

    public function test_dashboard_cuenta_los_despachados_del_mes_argentino(): void
    {
        $pedido = $this->pedido(EstadoPedido::Despachado, 1, '2026-10-02 12:00:00');
        // Despachado el 31/10 a las 23:00 ART (= 01/11 02:00 UTC): sigue siendo octubre.
        DB::table('pedidos')->where('id', $pedido->id)->update(['despachado_at' => '2026-11-01 02:00:00']);

        Carbon::setTestNow('2026-10-31 23:30:00'); // 20:30 ART del 31/10
        $this->actingAs(User::factory()->create())->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.pedidos_despachados_mes', 1));

        Carbon::setTestNow('2026-11-01 03:30:00'); // 00:30 ART del 1/11: ya es noviembre
        $this->actingAs(User::factory()->create())->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.pedidos_despachados_mes', 0));
    }

    public function test_dashboard_producto_mas_vendido_solo_considera_ventas(): void
    {
        $this->pedido(EstadoPedido::Despachado, 100, '2026-10-10 12:00:00', 'Vendido');
        $this->pedido(EstadoPedido::Pendiente, 100, '2026-10-10 12:00:00', 'Reservado');
        $this->pedido(EstadoPedido::Pendiente, 100, '2026-10-10 12:00:00', 'Reservado');

        $this->actingAs(User::factory()->create())->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.producto_mas_vendido.nombre', 'Vendido'));
    }

    public function test_listado_de_pedidos_separa_ventas_de_pendientes(): void
    {
        $this->pedido(EstadoPedido::Despachado, 1000, '2026-10-10 12:00:00');
        $this->pedido(EstadoPedido::Pendiente, 300, '2026-10-10 12:00:00');
        $this->pedido(EstadoPedido::Cancelado, 7000, '2026-10-10 12:00:00');

        $this->actingAs(User::factory()->create())->get(route('pedidos.index'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion', 1000)
                ->where('stats.pendientes_monto', 300)
                ->where('stats.unidades_vendidas', 1)
            );
    }

    public function test_zona_horaria_convierte_dias_argentinos_a_la_zona_de_la_base(): void
    {
        [$inicio, $fin] = ZonaHoraria::rangoDelDia('2026-10-18');

        $this->assertSame('2026-10-18 03:00:00', $inicio->format('Y-m-d H:i:s'));
        $this->assertSame('2026-10-19 02:59:59', $fin->format('Y-m-d H:i:s'));
        $this->assertSame('UTC', $inicio->getTimezone()->getName());

        $local = ZonaHoraria::aLocal(Carbon::parse('2026-10-19 02:59:59', 'UTC'));
        $this->assertSame('2026-10-18 23:59:59', $local->format('Y-m-d H:i:s'));
    }
}
