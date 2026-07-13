<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Models\PedidoItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MetricasController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'periodo' => ['nullable', Rule::in(['mensual', 'diario'])],
            'fecha' => ['nullable', 'date'],
        ]);

        $periodo = $validated['periodo'] ?? 'mensual';
        $fecha = isset($validated['fecha']) ? Carbon::parse($validated['fecha']) : now();

        if ($periodo === 'mensual') {
            $inicio = $fecha->copy()->startOfMonth();
            $fin = $fecha->copy()->endOfMonth();
            $inicioAnterior = $inicio->copy()->subMonthNoOverflow();
            $finAnterior = $inicioAnterior->copy()->endOfMonth();
        } else {
            $inicio = $fecha->copy()->startOfDay();
            $fin = $fecha->copy()->endOfDay();
            $inicioAnterior = $inicio->copy()->subDay();
            $finAnterior = $inicioAnterior->copy()->endOfDay();
        }

        $facturacionTotal = (float) Pedido::facturables()->whereBetween('created_at', [$inicio, $fin])->sum('total');
        $cantidadPedidos = Pedido::facturables()->whereBetween('created_at', [$inicio, $fin])->count();
        $facturacionAnterior = (float) Pedido::facturables()->whereBetween('created_at', [$inicioAnterior, $finAnterior])->sum('total');

        return Inertia::render('Admin/Metricas/Index', [
            'periodo' => $periodo,
            'fecha' => $fecha->toDateString(),
            'stats' => [
                'facturacion_total' => $facturacionTotal,
                'cantidad_pedidos' => $cantidadPedidos,
                'ticket_promedio' => $cantidadPedidos > 0 ? round($facturacionTotal / $cantidadPedidos, 2) : 0,
                'facturacion_serie' => $periodo === 'mensual'
                    ? $this->serieMensual($inicio, $fin)
                    : $this->serieDiaria($inicio, $fin),
                'comparacion_periodo_anterior' => [
                    'facturacion' => $facturacionAnterior,
                    // null cuando el período anterior no tuvo facturación: no hay base sobre la que calcular un % de variación.
                    'variacion_pct' => $facturacionAnterior > 0
                        ? round((($facturacionTotal - $facturacionAnterior) / $facturacionAnterior) * 100, 2)
                        : null,
                ],
                'top_productos' => $this->topProductos($inicio, $fin),
            ],
        ]);
    }

    private function serieMensual(Carbon $inicio, Carbon $fin): array
    {
        $totales = Pedido::facturables()
            ->whereBetween('created_at', [$inicio, $fin])
            ->selectRaw('DATE(created_at) as fecha, SUM(total) as monto')
            ->groupBy('fecha')
            ->pluck('monto', 'fecha');

        $serie = [];
        $cursor = $inicio->copy()->startOfDay();

        while ($cursor->lte($fin)) {
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
     * Un punto por hora (0-23) del día seleccionado. Para "ver un día" interesa la
     * distribución horaria de ventas dentro de ese día; comparar ese día contra
     * otros días ya lo cubre el modo mensual. Las horas sin pedidos quedan en 0.
     */
    private function serieDiaria(Carbon $inicio, Carbon $fin): array
    {
        $totales = Pedido::facturables()
            ->whereBetween('created_at', [$inicio, $fin])
            ->selectRaw('HOUR(created_at) as hora, SUM(total) as monto')
            ->groupBy('hora')
            ->pluck('monto', 'hora');

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
            ->whereHas('pedido', fn ($query) => $query->facturables()->whereBetween('created_at', [$inicio, $fin]))
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
