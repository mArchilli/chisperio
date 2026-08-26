<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Exceptions\StockInsuficienteException;
use App\Models\Addon;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Services\CodigoDescuentoService;
use App\Services\PricingService;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\ValidationException;
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
        $pedido->load([
            'items.producto.imagenPrincipal',
            'items.producto.categorias',
            // Solo relevante para pedidos cancelados (se muestra la reposición en el detalle),
            // pero cargarlo siempre es barato y evita una segunda ida y vuelta si en el futuro
            // se necesita en otro estado.
            'movimientosStock' => fn ($query) => $query->where('motivo', MotivoMovimientoStock::PedidoCancelado),
            'movimientosStock.producto',
        ]);

        return Inertia::render('Admin/Pedidos/Show', [
            'pedido' => $pedido,
        ]);
    }

    /**
     * Update the estado of the specified resource.
     */
    public function cambiarEstado(Request $request, Pedido $pedido, StockService $stockService, CodigoDescuentoService $codigoDescuentoService)
    {
        $validated = $request->validate([
            'estado' => ['required', new Enum(EstadoPedido::class)],
        ]);

        $estadoActual = $pedido->estado;
        $estadoDestino = EstadoPedido::from($validated['estado']);

        if (! $estadoActual->puedeTransicionarA($estadoDestino)) {
            throw ValidationException::withMessages([
                'estado' => $this->mensajeTransicionInvalida($estadoActual, $estadoDestino),
            ]);
        }

        $guardarEstado = function () use ($pedido, $estadoDestino) {
            $pedido->update([
                'estado' => $estadoDestino,
                'despachado_at' => $estadoDestino === EstadoPedido::Despachado
                    ? ($pedido->despachado_at ?? now())
                    : null,
            ]);
        };

        if ($estadoDestino === EstadoPedido::Cancelado) {
            // reponer() y liberarUso() dentro de la misma transacción que el update: si
            // por lo que sea algo falla, el estado no queda cambiado a medias (rollback
            // también del estado). La protección contra doble cancelación es la
            // validación de transición de arriba (Cancelado es terminal); ver el test
            // "cancelar dos veces seguidas" — la segunda llamada ni siquiera llega acá.
            DB::transaction(function () use ($pedido, $stockService, $codigoDescuentoService, $guardarEstado) {
                $stockService->reponer($pedido);
                $codigoDescuentoService->liberarUso($pedido);
                $guardarEstado();
            });
        } else {
            // pendiente↔despachado no toca stock ni el código de descuento.
            $guardarEstado();
        }

        return back()->with('success', 'Estado del pedido actualizado.');
    }

    /**
     * Mensaje legible para una transición de estado no permitida. Cubre, en orden:
     * el pedido ya está cancelado (terminal), sigue en el mismo estado, o el caso
     * concreto que motiva esta regla (no se puede cancelar directo un despachado).
     */
    private function mensajeTransicionInvalida(EstadoPedido $actual, EstadoPedido $destino): string
    {
        if ($actual === EstadoPedido::Cancelado) {
            return 'Este pedido ya está cancelado. Es un estado final, no se puede volver a cambiar.';
        }

        if ($actual === $destino) {
            return "El pedido ya está \"{$actual->label()}\".";
        }

        if ($actual === EstadoPedido::Despachado && $destino === EstadoPedido::Cancelado) {
            return 'No se puede cancelar un pedido despachado. Primero volvé el pedido a pendiente.';
        }

        return "No se puede pasar de \"{$actual->label()}\" a \"{$destino->label()}\".";
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, PricingService $pricingService, StockService $stockService, CodigoDescuentoService $codigoDescuentoService)
    {
        $validated = $request->validate([
            'cliente_nombre' => 'required|string|max:255',
            'cliente_dni' => 'nullable|string|max:50',
            'cliente_telefono' => 'nullable|string|max:50',
            'cliente_email' => 'nullable|email|max:255',
            'cliente_provincia' => 'nullable|string|max:255',
            'cliente_ciudad' => 'nullable|string|max:255',
            'cliente_codigo_postal' => 'nullable|string|max:20',
            'observaciones' => 'nullable|string',
            'codigo_descuento' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|integer|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.variante_id' => 'nullable|integer',
            'items.*.addons' => 'nullable|array',
            'items.*.addons.*.addon_id' => 'required|integer',
            'items.*.addons.*.texto_personalizado' => 'nullable|string|max:1000',
        ]);

        // Chequeo optimista (sin lock) para dar feedback rápido antes de intentar escribir.
        // El chequeo real y definitivo, con lock por fila, pasa dentro de descontar() más abajo.
        $faltantes = $stockService->validarDisponibilidad($validated['items']);

        if (! empty($faltantes)) {
            $this->abortarPorStockInsuficiente($faltantes);
        }

        try {
            $pedido = DB::transaction(function () use ($validated, $pricingService, $stockService, $codigoDescuentoService) {
                $productos = Producto::with(['escalasPrecio', 'ofertaVigente'])
                    ->whereIn('id', collect($validated['items'])->pluck('producto_id'))
                    ->get()
                    ->keyBy('id');

                $subtotal = 0;
                $itemsData = [];

                foreach ($validated['items'] as $item) {
                    $producto = $productos->get($item['producto_id']);
                    $varianteId = $item['variante_id'] ?? null;
                    $addonsInput = collect($item['addons'] ?? []);

                    // calcularPrecio() valida acá mismo (con 422 si corresponde) que la
                    // variante y cada addon pertenezcan a este producto y estén activos —
                    // ver PricingService::resolverVariante/resolverAddons. Nunca se confía
                    // en nombre/precio que pudo mandar el frontend.
                    $priceResult = $pricingService->calcularPrecio(
                        $producto,
                        $item['cantidad'],
                        $varianteId,
                        $addonsInput->pluck('addon_id')->all()
                    );

                    $addonsSeleccionados = collect($priceResult->addons_aplicados)
                        ->map(function (Addon $addon) use ($addonsInput) {
                            $texto = $addon->requiere_texto
                                ? trim((string) ($addonsInput->firstWhere('addon_id', $addon->id)['texto_personalizado'] ?? ''))
                                : null;

                            if ($addon->requiere_texto && $texto === '') {
                                throw ValidationException::withMessages([
                                    'addons' => "El add-on \"{$addon->nombre}\" requiere un texto de personalización.",
                                ]);
                            }

                            return [
                                'addon_id' => $addon->id,
                                'nombre' => $addon->nombre,
                                'precio' => round((float) ($addon->pivot->precio_override ?? $addon->precio), 2),
                                'texto_personalizado' => $texto,
                            ];
                        })
                        ->values()
                        ->all();

                    $itemSubtotal = round($priceResult->precio_final_con_opciones * $item['cantidad'], 2);
                    $subtotal += $itemSubtotal;

                    $itemsData[] = [
                        'producto_id' => $producto->id,
                        'producto_variante_id' => $priceResult->variante_aplicada?->id,
                        'titulo' => $producto->titulo,
                        'precio_unitario' => $priceResult->precio_final_con_opciones,
                        'cantidad' => $item['cantidad'],
                        'subtotal' => $itemSubtotal,
                        'variante_nombre' => $priceResult->variante_aplicada?->nombre,
                        'variante_color_hex' => $priceResult->variante_aplicada?->color_hex,
                        'recargo_variante_unitario' => $priceResult->recargo_variante,
                        'addons_seleccionados' => $addonsSeleccionados !== [] ? $addonsSeleccionados : null,
                        'addons_total_unitario' => $priceResult->addons_total,
                        'precio_base_unitario' => $priceResult->precio_unitario_final,
                    ];
                }

                // Código de descuento: se resuelve y lockea ACÁ, dentro de la transacción —
                // nunca se confía en lo que mandó el frontend (Fases 2 y 3 son solo
                // previsualización de UX). Si no es válido, resolverParaCheckout() lanza
                // ValidationException y aborta toda la creación del pedido (rollback), no
                // lo crea sin el descuento en silencio.
                $datosDescuento = $codigoDescuentoService->resolverParaCheckout(
                    $validated['codigo_descuento'] ?? null,
                    $subtotal
                );

                $pedido = Pedido::create([
                    'cliente_nombre' => $validated['cliente_nombre'],
                    'cliente_dni' => $validated['cliente_dni'] ?? null,
                    'cliente_telefono' => $validated['cliente_telefono'] ?? null,
                    'cliente_email' => $validated['cliente_email'] ?? null,
                    'cliente_provincia' => $validated['cliente_provincia'] ?? null,
                    'cliente_ciudad' => $validated['cliente_ciudad'] ?? null,
                    'cliente_codigo_postal' => $validated['cliente_codigo_postal'] ?? null,
                    'observaciones' => $validated['observaciones'] ?? null,
                    'subtotal' => $subtotal,
                    'total' => round($subtotal - $datosDescuento['descuento_monto'], 2),
                    'estado' => EstadoPedido::Pendiente,
                    'codigo_descuento_id' => $datosDescuento['codigo_descuento_id'],
                    'codigo_descuento_texto' => $datosDescuento['codigo_descuento_texto'],
                    'codigo_descuento_tipo' => $datosDescuento['codigo_descuento_tipo'],
                    'codigo_descuento_valor' => $datosDescuento['codigo_descuento_valor'],
                    'descuento_monto' => $datosDescuento['descuento_monto'],
                ]);

                $pedido->items()->createMany($itemsData);

                // Recién con el pedido ya creado consumimos el cupo: si algo de lo que sigue
                // falla (stock insuficiente más abajo), el rollback de la transacción
                // deshace también este increment junto con todo lo demás.
                if ($datosDescuento['codigoDescuento'] !== null) {
                    $datosDescuento['codigoDescuento']->increment('usos_actuales');
                }

                // Dentro de la misma transacción: si el stock cambió entre la validación
                // optimista de arriba y este momento (carrera real), descontar() lanza
                // StockInsuficienteException y el rollback deshace también el pedido recién
                // creado. DB::transaction() anidado usa un savepoint, no abre una conexión
                // ni una transacción nueva.
                $stockService->descontar($pedido);

                return $pedido;
            });
        } catch (StockInsuficienteException $e) {
            $this->abortarPorStockInsuficiente([[
                'producto_id' => $e->productoId,
                'cantidad' => $e->cantidadSolicitada,
                'stock_disponible' => $e->stockDisponible,
            ]]);
        }

        // El pedido y el descuento de stock ya están confirmados acá (transacción commiteada).
        // El envío del mensaje de WhatsApp lo dispara el frontend con esta respuesta (ver
        // resources/js/Pages/Checkout.jsx): no hay ningún envío del lado del servidor que
        // pueda fallar después de este punto y requerir revertir la venta.
        return response()->json([
            'id' => $pedido->id,
            'total' => $pedido->total,
        ], 201);
    }

    /**
     * Convierte una lista de items sin stock suficiente (shape de
     * StockService::validarDisponibilidad, o el equivalente armado a partir de una
     * StockInsuficienteException) en una ValidationException 422 con un mensaje legible
     * por producto, mismo formato que el resto de los errores de este endpoint.
     *
     * @param  array<int, array{producto_id: int, cantidad: int, stock_disponible: int}>  $faltantes
     */
    private function abortarPorStockInsuficiente(array $faltantes): never
    {
        $titulos = Producto::whereIn('id', collect($faltantes)->pluck('producto_id'))->pluck('titulo', 'id');

        $mensajes = [];

        foreach ($faltantes as $faltante) {
            $titulo = $titulos->get($faltante['producto_id'], 'este producto');

            $mensajes["stock.{$faltante['producto_id']}"] = $faltante['stock_disponible'] > 0
                ? "Solo quedan {$faltante['stock_disponible']} unidades de {$titulo} (pediste {$faltante['cantidad']}). Ajustá la cantidad."
                : "No queda stock de {$titulo}.";
        }

        throw ValidationException::withMessages($mensajes);
    }
}
