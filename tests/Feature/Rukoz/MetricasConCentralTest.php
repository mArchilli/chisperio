<?php

namespace Tests\Feature\Rukoz;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * 11.4 — Métricas con pedidos del Central: la venta de un pedido con `rukoz_ref` cuenta desde `confirmado_at` (no desde que
 * se creó ni desde el despacho); confirmados, empaquetados, despachados y entregados cuentan; anulados, cancelados y reservas
 * sin confirmar no. Los pedidos viejos (sin `rukoz_ref`) siguen como siempre: despachados, por su fecha de creación.
 */
class MetricasConCentralTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * @param  string|null  $confirmadoUtc  `confirmado_at` (UTC, como se guarda); null = sin confirmar
     */
    private function delCentral(EstadoPedido $estado, float $total, string $creadoUtc, ?string $confirmadoUtc, string $titulo = 'Producto'): Pedido
    {
        $pedido = Pedido::create([
            'cliente_nombre' => 'Cliente', 'subtotal' => $total, 'total' => $total, 'estado' => $estado,
            'rukoz_ref' => 'CHP-'.strtoupper(bin2hex(random_bytes(6))), 'rukoz_estado' => $estado === EstadoPedido::Pendiente ? 'reservado' : $estado->value,
            'rukoz_version' => 1, 'confirmado_at' => $confirmadoUtc,
        ]);
        $pedido->items()->create(['titulo' => $titulo, 'precio_unitario' => $total, 'cantidad' => 1, 'subtotal' => $total]);
        DB::table('pedidos')->where('id', $pedido->id)->update(['created_at' => $creadoUtc, 'updated_at' => $creadoUtc]);

        return $pedido;
    }

    private function viejo(EstadoPedido $estado, float $total, string $creadoUtc): Pedido
    {
        $pedido = Pedido::create(['cliente_nombre' => 'Cliente', 'subtotal' => $total, 'total' => $total, 'estado' => $estado]);
        $pedido->items()->create(['titulo' => 'Viejo', 'precio_unitario' => $total, 'cantidad' => 1, 'subtotal' => $total]);
        DB::table('pedidos')->where('id', $pedido->id)->update(['created_at' => $creadoUtc, 'updated_at' => $creadoUtc]);

        return $pedido;
    }

    private function metricas(array $query)
    {
        return $this->actingAs(User::factory()->create())->get(route('metricas.index', $query));
    }

    public function test_cuentan_confirmados_empaquetados_despachados_y_entregados_y_no_los_anulados_ni_las_reservas(): void
    {
        $this->delCentral(EstadoPedido::Confirmado, 1000, '2026-10-10 15:00:00', '2026-10-10 16:00:00');
        $this->delCentral(EstadoPedido::Empaquetado, 2000, '2026-10-10 15:00:00', '2026-10-10 16:00:00');
        $this->delCentral(EstadoPedido::Despachado, 3000, '2026-10-10 15:00:00', '2026-10-10 16:00:00');
        $this->delCentral(EstadoPedido::Entregado, 4000, '2026-10-10 15:00:00', '2026-10-10 16:00:00');
        $this->delCentral(EstadoPedido::Anulado, 50000, '2026-10-10 15:00:00', '2026-10-10 16:00:00');
        $this->delCentral(EstadoPedido::Cancelado, 60000, '2026-10-10 15:00:00', null);
        // Reservado sin confirmar: va a «pendientes», no a ventas.
        $this->delCentral(EstadoPedido::Pendiente, 700, '2026-10-10 15:00:00', null);

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 10000)
                ->where('stats.cantidad_pedidos', 4)
                ->where('stats.ticket_promedio', 2500)
                ->where('stats.pendientes.monto', 700)
                ->where('stats.pendientes.cantidad', 1)
            );
    }

    public function test_la_venta_cuenta_el_dia_de_la_confirmacion_no_el_de_creacion(): void
    {
        // Creado el 30/09 pero confirmado el 02/10: es una venta de octubre.
        $this->delCentral(EstadoPedido::Confirmado, 8000, '2026-09-30 15:00:00', '2026-10-02 15:00:00');
        // Creado el 10/10 pero confirmado el 03/11: es una venta de noviembre.
        $this->delCentral(EstadoPedido::Confirmado, 500, '2026-10-10 15:00:00', '2026-11-03 15:00:00');

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 8000)->where('stats.cantidad_pedidos', 1));
        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-11-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 500)->where('stats.cantidad_pedidos', 1));
        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-09-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 0));
    }

    public function test_borde_de_medianoche_argentina_usa_confirmado_at(): void
    {
        // Día 15/10 argentino = 15/10 03:00 UTC hasta 16/10 02:59:59 UTC.
        $this->delCentral(EstadoPedido::Confirmado, 100, '2026-10-01 12:00:00', '2026-10-15 02:59:59'); // 14/10 23:59:59 ARG → día 14
        $this->delCentral(EstadoPedido::Confirmado, 200, '2026-10-01 12:00:00', '2026-10-15 03:00:00'); // 15/10 00:00:00 ARG → día 15
        $this->delCentral(EstadoPedido::Confirmado, 400, '2026-10-01 12:00:00', '2026-10-16 02:59:59'); // 15/10 23:59:59 ARG → día 15
        $this->delCentral(EstadoPedido::Confirmado, 800, '2026-10-01 12:00:00', '2026-10-16 03:00:00'); // 16/10 00:00:00 ARG → día 16

        $this->metricas(['periodo' => 'diario', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 600)
                ->where('stats.cantidad_pedidos', 2)
                ->where('stats.facturacion_serie.0.total', 200) // 00:00 ARG
                ->where('stats.facturacion_serie.23.total', 400) // 23:59 ARG
            );
        $this->metricas(['periodo' => 'diario', 'fecha' => '2026-10-14'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 100));
        $this->metricas(['periodo' => 'diario', 'fecha' => '2026-10-16'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 800));
    }

    public function test_borde_de_mes_argentino_y_la_serie_mensual_agrupa_por_dia_de_confirmacion(): void
    {
        $this->delCentral(EstadoPedido::Confirmado, 300, '2026-10-01 12:00:00', '2026-11-01 02:59:59'); // 31/10 23:59:59 ARG → octubre
        $this->delCentral(EstadoPedido::Confirmado, 700, '2026-10-01 12:00:00', '2026-11-01 03:00:00'); // 01/11 00:00:00 ARG → noviembre

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 300)
                ->where('stats.facturacion_serie.30.fecha', '2026-10-31')
                ->where('stats.facturacion_serie.30.total', 300)
            );
        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-11-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 700)->where('stats.facturacion_serie.0.total', 700));
    }

    public function test_un_pedido_anulado_despues_de_confirmar_deja_de_contar(): void
    {
        $pedido = $this->delCentral(EstadoPedido::Confirmado, 9000, '2026-10-10 15:00:00', '2026-10-10 16:00:00', 'Pistola');
        $this->delCentral(EstadoPedido::Confirmado, 1000, '2026-10-10 15:00:00', '2026-10-10 16:00:00', 'Chispa');

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 10000)->where('stats.top_productos.0.nombre', 'Pistola'));

        $pedido->update(['estado' => EstadoPedido::Anulado, 'rukoz_estado' => 'anulado']);

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 1000)->where('stats.cantidad_pedidos', 1)->where('stats.top_productos.0.nombre', 'Chispa'));
    }

    public function test_un_despachado_manual_con_reserva_que_nunca_se_confirmo_no_es_una_venta(): void
    {
        // Pedido con rukoz_ref «despachado» a mano (11.3) pero sin confirmar en el Central: el Central no lo conoce como venta.
        $this->delCentral(EstadoPedido::Despachado, 5000, '2026-10-10 15:00:00', null);

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page->where('stats.facturacion_total', 0)->where('stats.cantidad_pedidos', 0));
    }

    public function test_los_pedidos_viejos_siguen_como_siempre_despachados_por_su_fecha_de_creacion(): void
    {
        $this->viejo(EstadoPedido::Despachado, 1000, '2026-10-10 15:00:00');
        $this->viejo(EstadoPedido::Pendiente, 500, '2026-10-10 15:00:00');
        $this->viejo(EstadoPedido::Cancelado, 9999, '2026-10-10 15:00:00');
        // Y conviven con uno del Central confirmado.
        $this->delCentral(EstadoPedido::Confirmado, 2000, '2026-10-12 15:00:00', '2026-10-12 16:00:00');

        $this->metricas(['periodo' => 'mensual', 'fecha' => '2026-10-15'])
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion_total', 3000)
                ->where('stats.cantidad_pedidos', 2)
                ->where('stats.pendientes.monto', 500)
            );
    }

    public function test_el_listado_y_el_dashboard_usan_las_mismas_ventas(): void
    {
        $this->delCentral(EstadoPedido::Confirmado, 2500, '2026-10-12 15:00:00', '2026-10-12 16:00:00', 'Pistola');
        $this->delCentral(EstadoPedido::Anulado, 9000, '2026-10-12 15:00:00', '2026-10-12 16:00:00', 'Anulada');
        $this->delCentral(EstadoPedido::Pendiente, 700, '2026-10-12 15:00:00', null);

        $admin = User::factory()->create();

        $this->actingAs($admin)->get(route('pedidos.index', ['estado' => 'todos']))
            ->assertInertia(fn ($page) => $page
                ->where('stats.facturacion', 2500)
                ->where('stats.pendientes_monto', 700)
                ->where('stats.confirmados_count', 1)
                ->where('stats.anulados_count', 1)
            );

        $this->actingAs($admin)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.producto_mas_vendido.nombre', 'Pistola'));
    }
}
