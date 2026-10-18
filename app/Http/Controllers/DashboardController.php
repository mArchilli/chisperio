<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Enums\Sucursal;
use App\Models\Pedido;
use App\Models\Producto;
use App\Support\ZonaHoraria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // El vendedor ve solo los números de su sucursal (consistente con su
        // listado de pedidos); el admin (sucursal null) ve el total. Los datos de
        // catálogo (productos) son globales para ambos.
        $sucursal = $request->user()->esAdmin() ? null : $request->user()->sucursal;

        // "Este mes" es el mes calendario argentino (ver ZonaHoraria), no el de UTC.
        [$inicioMes, $finMes] = ZonaHoraria::rangoDelMes(ZonaHoraria::ahora());

        return Inertia::render('Dashboard', [
            'stats' => [
                'productos_count' => Producto::where('is_active', true)->count(),
                'productos_total' => Producto::count(),
                'productos_sin_stock_count' => Producto::sinStock()->count(),
                'pedidos_pendientes_count' => Pedido::deSucursal($sucursal)
                    ->where('estado', EstadoPedido::Pendiente)
                    ->count(),
                'pedidos_despachados_mes' => Pedido::deSucursal($sucursal)
                    ->where('estado', EstadoPedido::Despachado)
                    ->whereBetween('despachado_at', [$inicioMes, $finMes])
                    ->count(),
                'pedidos_por_dia' => $this->pedidosPorDia($sucursal),
                'producto_mas_vendido' => $this->productoMasVendido($sucursal),
            ],
        ]);
    }

    /**
     * Pedidos creados por día, últimos 30 días argentinos (incluido hoy). Se agrupa en PHP
     * por el día en hora argentina: un DATE(created_at) en SQL agruparía por el día de la
     * zona en que se guardó y movería a "mañana" los pedidos de la noche.
     */
    private function pedidosPorDia(?Sucursal $sucursal): array
    {
        $hoy = ZonaHoraria::ahora()->startOfDay();
        $desdeLocal = $hoy->copy()->subDays(29);
        [$desde] = ZonaHoraria::rangoDelDia($desdeLocal);

        $conteos = Pedido::query()
            ->where('created_at', '>=', $desde)
            ->when($sucursal, fn ($query) => $query->where('sucursal', $sucursal->value))
            ->get(['created_at'])
            ->countBy(fn (Pedido $pedido) => ZonaHoraria::aLocal($pedido->created_at)->toDateString());

        $dias = [];
        $cursor = $desdeLocal->copy();

        while ($cursor->lte($hoy)) {
            $fecha = $cursor->toDateString();

            $dias[] = [
                'fecha' => $fecha,
                'cantidad' => (int) ($conteos[$fecha] ?? 0),
            ];

            $cursor->addDay();
        }

        return $dias;
    }

    /** Producto con más unidades en VENTAS cerradas (los pendientes y cancelados no cuentan). */
    private function productoMasVendido(?Sucursal $sucursal): ?array
    {
        $masVendido = DB::table('pedido_items')
            ->join('pedidos', 'pedidos.id', '=', 'pedido_items.pedido_id')
            ->whereIn('pedidos.estado', array_map(fn (EstadoPedido $estado) => $estado->value, EstadoPedido::estadosDeVenta()))
            ->when($sucursal, fn ($query) => $query->where('pedidos.sucursal', $sucursal->value))
            ->select('pedido_items.producto_id', 'pedido_items.titulo', DB::raw('SUM(pedido_items.cantidad) as unidades'))
            ->groupBy('pedido_items.producto_id', 'pedido_items.titulo')
            ->orderByDesc('unidades')
            ->first();

        if (! $masVendido) {
            return null;
        }

        return [
            'nombre' => $masVendido->titulo,
            'unidades' => (int) $masVendido->unidades,
        ];
    }
}
