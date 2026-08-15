<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard', [
            'stats' => [
                'productos_count' => Producto::where('is_active', true)->count(),
                'productos_total' => Producto::count(),
                'productos_sin_stock_count' => Producto::where('stock', 0)->count(),
                'pedidos_pendientes_count' => Pedido::where('estado', EstadoPedido::Pendiente)->count(),
                'pedidos_despachados_mes' => Pedido::where('estado', EstadoPedido::Despachado)
                    ->whereBetween('despachado_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
                'pedidos_por_dia' => $this->pedidosPorDia(),
                'producto_mas_vendido' => $this->productoMasVendido(),
            ],
        ]);
    }

    private function pedidosPorDia(): array
    {
        $desde = now()->subDays(29)->startOfDay();

        $conteos = DB::table('pedidos')
            ->selectRaw('DATE(created_at) as fecha, COUNT(*) as cantidad')
            ->where('created_at', '>=', $desde)
            ->groupBy('fecha')
            ->pluck('cantidad', 'fecha');

        $dias = [];
        $cursor = $desde->copy();
        $hoy = now()->startOfDay();

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

    private function productoMasVendido(): ?array
    {
        $masVendido = DB::table('pedido_items')
            ->join('pedidos', 'pedidos.id', '=', 'pedido_items.pedido_id')
            ->where('pedidos.estado', '!=', EstadoPedido::Cancelado->value)
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
