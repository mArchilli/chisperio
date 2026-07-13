<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Inertia\Inertia;

class PedidoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $request->validate([
            'estado' => ['nullable', 'string', Rule::in(['todos', ...array_column(EstadoPedido::cases(), 'value')])],
        ]);

        $filtroEstado = $request->filled('estado') ? $request->query('estado') : EstadoPedido::Pendiente->value;

        $pedidos = Pedido::with('items')
            ->when($filtroEstado !== 'todos', fn ($query) => $query->where('estado', $filtroEstado))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Pedidos/Index', [
            'pedidos' => $pedidos,
            'filtroEstado' => $filtroEstado,
            'stats' => [
                'pendientes_count' => Pedido::where('estado', EstadoPedido::Pendiente)->count(),
                'despachados_count' => Pedido::where('estado', EstadoPedido::Despachado)->count(),
                'cancelados_count' => Pedido::where('estado', EstadoPedido::Cancelado)->count(),
                'unidades_vendidas' => (int) PedidoItem::whereHas('pedido', fn ($query) => $query->facturables())->sum('cantidad'),
                'facturacion' => (float) Pedido::facturables()->sum('total'),
            ],
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Pedido $pedido)
    {
        $pedido->load(['items.producto.imagenPrincipal', 'items.producto.categorias']);

        return Inertia::render('Admin/Pedidos/Show', [
            'pedido' => $pedido,
        ]);
    }

    /**
     * Update the estado of the specified resource.
     */
    public function cambiarEstado(Request $request, Pedido $pedido)
    {
        $validated = $request->validate([
            'estado' => ['required', new Enum(EstadoPedido::class)],
        ]);

        $nuevoEstado = $validated['estado'];

        $pedido->update([
            'estado' => $nuevoEstado,
            'despachado_at' => $nuevoEstado === EstadoPedido::Despachado->value
                ? ($pedido->despachado_at ?? now())
                : null,
        ]);

        return back()->with('success', 'Estado del pedido actualizado.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'cliente_nombre' => 'required|string|max:255',
            'cliente_dni' => 'nullable|string|max:50',
            'cliente_telefono' => 'nullable|string|max:50',
            'cliente_email' => 'nullable|email|max:255',
            'cliente_provincia' => 'nullable|string|max:255',
            'cliente_direccion' => 'nullable|string|max:500',
            'cliente_codigo_postal' => 'nullable|string|max:20',
            'observaciones' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|integer|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
        ]);

        $pedido = DB::transaction(function () use ($validated) {
            $productos = Producto::with('ofertaVigente')
                ->whereIn('id', collect($validated['items'])->pluck('producto_id'))
                ->get()
                ->keyBy('id');

            $subtotal = 0;
            $itemsData = [];

            foreach ($validated['items'] as $item) {
                $producto = $productos->get($item['producto_id']);

                $precioUnitario = $producto->ofertaVigente
                    ? (float) $producto->ofertaVigente->precio_oferta
                    : (float) $producto->precio;

                $itemSubtotal = round($precioUnitario * $item['cantidad'], 2);
                $subtotal += $itemSubtotal;

                $itemsData[] = [
                    'producto_id' => $producto->id,
                    'titulo' => $producto->titulo,
                    'precio_unitario' => $precioUnitario,
                    'cantidad' => $item['cantidad'],
                    'subtotal' => $itemSubtotal,
                ];
            }

            $pedido = Pedido::create([
                'cliente_nombre' => $validated['cliente_nombre'],
                'cliente_dni' => $validated['cliente_dni'] ?? null,
                'cliente_telefono' => $validated['cliente_telefono'] ?? null,
                'cliente_email' => $validated['cliente_email'] ?? null,
                'cliente_provincia' => $validated['cliente_provincia'] ?? null,
                'cliente_direccion' => $validated['cliente_direccion'] ?? null,
                'cliente_codigo_postal' => $validated['cliente_codigo_postal'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'subtotal' => $subtotal,
                'total' => $subtotal,
                'estado' => EstadoPedido::Pendiente,
            ]);

            $pedido->items()->createMany($itemsData);

            return $pedido;
        });

        return response()->json([
            'id' => $pedido->id,
            'total' => $pedido->total,
        ], 201);
    }
}
