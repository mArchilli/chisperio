<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Support\ZonaHoraria;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Métricas de ventas del panel.
 *
 * - Ventas: pedidos en un estado de venta cerrada (Pedido::ventas(), ver
 *   EstadoPedido::estadosDeVenta()). Es lo que alimenta facturación, cantidad de pedidos,
 *   ticket promedio, la serie, la comparación con el período anterior y el top de productos.
 *   La FECHA de la venta (Pedido::ventasEntre / fechaDeVenta) es `confirmado_at` para los pedidos con
 *   `rukoz_ref` (11.4: la venta nace al confirmarla en el Central) y `created_at` para los de siempre.
 * - Pendientes: reservas todavía sin cerrar (o sin confirmar), con monto y cantidad aparte. No suman a las ventas.
 * - Cancelados y anulados: no suman nunca, ni a ventas ni a pendientes.
 *
 * Los períodos son días/meses ARGENTINOS (ver ZonaHoraria): lo guardado está en UTC, así que
 * un pedido hecho a las 22:00 hora argentina del día 31 pertenece al mes que termina, aunque
 * en la base figure ya como día 1 del mes siguiente.
 */
class MetricasController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'periodo' => ['nullable', Rule::in(['mensual', 'diario'])],
            'fecha' => ['nullable', 'date'],
        ]);

        $periodo = $validated['periodo'] ?? 'mensual';

        // "fecha" es un día calendario argentino (no un instante): se interpreta en hora argentina.
        $fecha = isset($validated['fecha'])
            ? ZonaHoraria::enZonaLocal($validated['fecha'])
            : ZonaHoraria::ahora();

        if ($periodo === 'mensual') {
            [$inicio, $fin] = ZonaHoraria::rangoDelMes($fecha);
            [$inicioAnterior, $finAnterior] = ZonaHoraria::rangoDelMes($fecha->copy()->startOfMonth()->subMonthNoOverflow());
        } else {
            [$inicio, $fin] = ZonaHoraria::rangoDelDia($fecha);
            [$inicioAnterior, $finAnterior] = ZonaHoraria::rangoDelDia($fecha->copy()->subDay());
        }

        $facturacionTotal = (float) Pedido::ventasEntre($inicio, $fin)->sum('total');
        $cantidadPedidos = Pedido::ventasEntre($inicio, $fin)->count();
        $facturacionAnterior = (float) Pedido::ventasEntre($inicioAnterior, $finAnterior)->sum('total');

        $pendientes = Pedido::pendientes()->whereBetween('created_at', [$inicio, $fin]);

        return Inertia::render('Admin/Metricas/Index', [
            'periodo' => $periodo,
            'fecha' => $fecha->toDateString(),
            'stats' => [
                // Ventas cerradas. Los nombres son los de siempre: facturación = ventas.
                'facturacion_total' => $facturacionTotal,
                'cantidad_pedidos' => $cantidadPedidos,
                'ticket_promedio' => $cantidadPedidos > 0 ? round($facturacionTotal / $cantidadPedidos, 2) : 0,
                'facturacion_serie' => $periodo === 'mensual'
                    ? $this->serieMensual($inicio, $fin, $fecha)
                    : $this->serieDiaria($inicio, $fin),
                'comparacion_periodo_anterior' => [
                    'facturacion' => $facturacionAnterior,
                    // null cuando el período anterior no tuvo facturación: no hay base sobre la que calcular un % de variación.
                    'variacion_pct' => $facturacionAnterior > 0
                        ? round((($facturacionTotal - $facturacionAnterior) / $facturacionAnterior) * 100, 2)
                        : null,
                ],
                // Reservas sin cerrar del mismo período, aparte de las ventas.
                'pendientes' => [
                    'monto' => (float) (clone $pendientes)->sum('total'),
                    'cantidad' => (clone $pendientes)->count(),
                ],
                'top_productos' => $this->topProductos($inicio, $fin),
            ],
        ]);
    }

    /**
     * Un punto por día del mes. Se agrupa en PHP (no con DATE(created_at) en SQL) para que el
     * día sea el argentino y no el de la zona en que se guardó, y para que funcione igual en
     * MySQL y en los tests con SQLite.
     */
    private function serieMensual(Carbon $inicio, Carbon $fin, Carbon $fecha): array
    {
        $totales = Pedido::ventasEntre($inicio, $fin)
            ->get(['created_at', 'confirmado_at', 'rukoz_ref', 'total'])
            ->groupBy(fn (Pedido $pedido) => ZonaHoraria::aLocal($pedido->fechaDeVenta())->toDateString())
            ->map(fn ($pedidos) => (float) $pedidos->sum('total'));

        $serie = [];
        $cursor = $fecha->copy()->startOfMonth();
        $ultimo = $fecha->copy()->endOfMonth();

        while ($cursor->lte($ultimo)) {
            $fechaStr = $cursor->toDateString();

            $serie[] = [
                'fecha' => $fechaStr,
                'total' => (float) ($totales[$fechaStr] ?? 0),
            ];

            $cursor->addDay();
        }

        return $serie;
    }

    /**
     * Un punto por hora (0-23, hora argentina) del día seleccionado. Para "ver un día"
     * interesa la distribución horaria de ventas dentro de ese día; comparar ese día contra
     * otros días ya lo cubre el modo mensual. Las horas sin pedidos quedan en 0.
     */
    private function serieDiaria(Carbon $inicio, Carbon $fin): array
    {
        $totales = Pedido::ventasEntre($inicio, $fin)
            ->get(['created_at', 'confirmado_at', 'rukoz_ref', 'total'])
            ->groupBy(fn (Pedido $pedido) => (int) ZonaHoraria::aLocal($pedido->fechaDeVenta())->format('G'))
            ->map(fn ($pedidos) => (float) $pedidos->sum('total'));

        $serie = [];

        for ($hora = 0; $hora < 24; $hora++) {
            $serie[] = [
                'hora' => $hora,
                'total' => (float) ($totales[$hora] ?? 0),
            ];
        }

        return $serie;
    }

    private function topProductos(Carbon $inicio, Carbon $fin): array
    {
        return PedidoItem::query()
            ->whereHas('pedido', fn ($query) => $query->ventasEntre($inicio, $fin))
            ->selectRaw('producto_id, titulo, SUM(subtotal) as monto')
            ->groupBy('producto_id', 'titulo')
            ->orderByDesc('monto')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'nombre' => $item->titulo,
                'monto' => (float) $item->monto,
            ])
            ->all();
    }
}
