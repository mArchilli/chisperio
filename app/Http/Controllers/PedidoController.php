<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Enums\Sucursal;
use App\Exceptions\StockInsuficienteException;
use App\Exceptions\VarianteRequeridaException;
use App\Models\Addon;
use App\Models\Combo;
use App\Models\ConfiguracionEnvio;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\PlanPagoTarjeta;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Services\CodigoDescuentoService;
use App\Services\PedidoEdicionService;
use App\Services\PricingService;
use App\Services\RecargoPagoService;
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
        $esAdmin = $request->user()->esAdmin();

        // Un vendedor sin sucursal está mal configurado: 403 explícito en vez de
        // reventar más abajo o (peor) terminar sin filtro y viendo todo.
        abort_if(! $esAdmin && $request->user()->sucursal === null, 403, 'Tu cuenta no tiene una sucursal asignada. Pedile a un administrador que la configure.');

        $request->validate([
            'estado' => ['nullable', 'string', Rule::in(['todos', ...array_column(EstadoPedido::cases(), 'value')])],
            'sucursal' => ['nullable', 'string', Rule::in(['todas', ...array_column(Sucursal::cases(), 'value')])],
        ]);

        $filtroEstado = $request->filled('estado') ? $request->query('estado') : EstadoPedido::Pendiente->value;

        // El vendedor queda fijado a su sucursal (no puede cambiarla); el admin
        // elige, con "todas" (default) = sin filtro. La lista y TODAS las stats se
        // scopean con el mismo criterio para que lo que se ve en las tarjetas
        // coincida con la lista.
        $filtroSucursal = $esAdmin
            ? ($request->filled('sucursal') ? $request->query('sucursal') : 'todas')
            : $request->user()->sucursal->value;

        $sucursalScope = $filtroSucursal === 'todas' ? null : $filtroSucursal;

        // items.combo: solo para saber si algún combo del pedido trae envío gratis propio.
        $pedidos = Pedido::with(['items', 'items.combo:id,envio_gratis'])
            ->deSucursal($sucursalScope)
            ->when($filtroEstado !== 'todos', fn ($query) => $query->where('estado', $filtroEstado))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Pedidos/Index', [
            'pedidos' => $pedidos,
            'filtroEstado' => $filtroEstado,
            'filtroSucursal' => $filtroSucursal,
            'puedeFiltrarSucursal' => $esAdmin,
            'stats' => [
                'pendientes_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Pendiente)->count(),
                'despachados_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Despachado)->count(),
                'cancelados_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Cancelado)->count(),
                'unidades_vendidas' => (int) PedidoItem::whereHas(
                    'pedido',
                    fn ($query) => $query->facturables()->deSucursal($sucursalScope)
                )->sum('cantidad'),
                'facturacion' => (float) Pedido::facturables()->deSucursal($sucursalScope)->sum('total'),
            ],
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Pedido $pedido)
    {
        $this->autorizarSucursal($request, $pedido);

        $pedido->load([
            'items.producto.imagenPrincipal',
            'items.producto.categorias',
            // Solo para saber si el combo trae envío gratis propio (se aclara en el detalle).
            'items.combo:id,envio_gratis',
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
     * Pantalla de edición de un pedido (admin y vendedor de la sucursal). Solo los
     * pedidos pendientes son editables: uno despachado ya salió con lo que decía, y
     * uno cancelado ya repuso su stock.
     */
    public function edit(Request $request, Pedido $pedido)
    {
        $this->autorizarSucursal($request, $pedido);

        if ($pedido->estado !== EstadoPedido::Pendiente) {
            return redirect()
                ->route('pedidos.show', $pedido)
                ->with('error', 'Solo se pueden editar pedidos pendientes.');
        }

        $pedido->load(['items.producto.imagenPrincipal', 'items.combo:id,envio_gratis']);

        // Variantes entre las que se puede elegir, por producto: las activas más la que el
        // item ya tiene aunque se haya desactivado después (para que el select la muestre).
        $productoIds = $pedido->items
            ->flatMap(fn ($item) => $item->combo_id !== null
                ? collect($item->combo_items_seleccionados ?? [])->pluck('producto_id')
                : [$item->producto_id])
            ->filter()
            ->unique()
            ->values();

        $varianteIdsEnUso = $pedido->items
            ->flatMap(fn ($item) => $item->combo_id !== null
                ? collect($item->combo_items_seleccionados ?? [])->pluck('producto_variante_id')
                : [$item->producto_variante_id])
            ->filter()
            ->unique()
            ->values();

        $variantesPorProducto = ProductoVariante::whereIn('producto_id', $productoIds)
            ->where(fn ($query) => $query->where('is_active', true)->orWhereIn('id', $varianteIdsEnUso))
            ->orderBy('orden')
            ->get(['id', 'producto_id', 'nombre', 'color_hex', 'es_color_personalizado', 'precio_adicional', 'stock'])
            ->groupBy('producto_id');

        return Inertia::render('Admin/Pedidos/Edit', [
            'pedido' => $pedido,
            'variantesPorProducto' => $variantesPorProducto,
        ]);
    }

    /**
     * Guarda la edición de un pedido pendiente. La lógica de items/totales/stock vive en
     * PedidoEdicionService; acá solo se autoriza y valida la forma del request.
     */
    public function actualizar(Request $request, Pedido $pedido, PedidoEdicionService $edicionService)
    {
        $this->autorizarSucursal($request, $pedido);

        $validated = $request->validate([
            'cliente_nombre' => 'required|string|max:255',
            'cliente_dni' => 'nullable|string|max:50',
            'cliente_telefono' => 'nullable|string|max:50',
            'cliente_email' => 'nullable|email|max:255',
            'cliente_provincia' => 'nullable|string|max:255',
            'cliente_ciudad' => 'nullable|string|max:255',
            'cliente_codigo_postal' => 'nullable|string|max:20',
            'observaciones' => 'nullable|string|max:5000',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|distinct',
            'items.*.cantidad' => 'required|integer|min:1|max:100000',
            'items.*.precio_unitario' => 'required|numeric|min:0|max:99999999',
            'items.*.variante_id' => 'nullable|integer',
            'items.*.color_personalizado_texto' => 'nullable|string|max:255',
            'items.*.addons_textos' => 'nullable|array',
            'items.*.addons_textos.*' => 'nullable|string|max:1000',
            'items.*.componentes_variantes' => 'nullable|array',
            'items.*.componentes_variantes.*' => 'nullable|integer',
        ], [
            'items.required' => 'El pedido necesita al menos un producto.',
            'items.min' => 'El pedido necesita al menos un producto.',
        ]);

        $edicionService->actualizar($pedido, $validated);

        return redirect()
            ->route('pedidos.show', $pedido)
            ->with('success', 'Pedido actualizado.');
    }

    /**
     * Update the estado of the specified resource.
     */
    public function cambiarEstado(Request $request, Pedido $pedido, StockService $stockService, CodigoDescuentoService $codigoDescuentoService)
    {
        $this->autorizarSucursal($request, $pedido);

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
     * Un vendedor solo puede ver/operar pedidos de su propia sucursal. El admin
     * (sucursal null) pasa siempre. Cubre el acceso directo por URL a un pedido
     * de otra sucursal, que el filtro del listado por sí solo no impediría.
     */
    private function autorizarSucursal(Request $request, Pedido $pedido): void
    {
        $usuario = $request->user();

        abort_if(
            ! $usuario->esAdmin() && $pedido->sucursal !== $usuario->sucursal,
            403,
            'Este pedido pertenece a otra sucursal.'
        );
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
    public function store(Request $request, PricingService $pricingService, StockService $stockService, CodigoDescuentoService $codigoDescuentoService, RecargoPagoService $recargoPagoService)
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
            // Sucursal con la que el cliente eligió coordinar (selector del checkout).
            // Si no llega, cae en Buenos Aires (el número histórico) — ver abajo.
            'sucursal' => ['nullable', Rule::enum(Sucursal::class)],
            'codigo_descuento' => 'nullable|string',
            'plan_pago_tarjeta_id' => 'nullable|integer',
            // Un pedido puede ser solo de productos sueltos, solo de combos, o una
            // mezcla — por eso ninguno de los dos arrays es 'required' en sí mismo,
            // pero se exige que al menos uno traiga contenido (chequeo debajo).
            'items' => 'nullable|array',
            'items.*.producto_id' => 'required|integer|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.variante_id' => 'nullable|integer',
            'items.*.addons' => 'nullable|array',
            'items.*.addons.*.addon_id' => 'required|integer',
            'items.*.addons.*.texto_personalizado' => 'nullable|string|max:1000',
            'items.*.color_personalizado_texto' => 'nullable|string|max:255',
            'combos' => 'nullable|array',
            'combos.*.combo_id' => 'required|integer|exists:combos,id',
            'combos.*.cantidad' => 'required|integer|min:1',
            'combos.*.selecciones' => 'nullable|array',
            'combos.*.selecciones.*.combo_producto_id' => 'required|integer',
            'combos.*.selecciones.*.variante_id' => 'nullable|integer',
        ]);

        if (empty($validated['items']) && empty($validated['combos'])) {
            throw ValidationException::withMessages([
                'items' => 'El pedido necesita al menos un producto o un combo.',
            ]);
        }

        $validated['items'] ??= [];

        // Resuelve cada línea de combo (variante fija del admin o elegida por el
        // comprador, validando que pertenezca al producto y esté activa) UNA vez acá
        // para el chequeo optimista de stock aplanado por producto/variante, y otra vez
        // dentro de la transacción para el precio/snapshot real — mismo espíritu que ya
        // tiene el resto del método (el chequeo de acá es un adelanto de UX, el que
        // importa de verdad es el que corre con lock dentro de StockService::descontar()).
        $combosResueltos = collect($validated['combos'] ?? [])->map(fn ($combo) => $this->resolverLineaCombo($combo));

        $itemsParaValidar = collect($validated['items'])
            ->map(fn ($item) => [
                'producto_id' => $item['producto_id'],
                'variante_id' => $item['variante_id'] ?? null,
                'cantidad' => (int) $item['cantidad'],
            ]);

        foreach ($combosResueltos as $resuelto) {
            foreach ($resuelto['componentes'] as $componente) {
                $itemsParaValidar->push([
                    'producto_id' => $componente['producto_id'],
                    'variante_id' => $componente['producto_variante_id'],
                    'cantidad' => $componente['cantidad_total'],
                ]);
            }
        }

        // Un mismo producto/variante puede aparecer repetido entre varias líneas (un
        // item suelto + un combo, o dos combos distintos) — se suman las cantidades
        // antes de validar, así el chequeo es sobre el total real que hace falta.
        $itemsParaValidarMerged = $itemsParaValidar
            ->groupBy(fn ($item) => $item['producto_id'] . ':' . ($item['variante_id'] ?? 'null'))
            ->map(fn ($grupo) => [
                'producto_id' => $grupo->first()['producto_id'],
                'variante_id' => $grupo->first()['variante_id'],
                'cantidad' => $grupo->sum('cantidad'),
            ])
            ->values()
            ->all();

        // Chequeo optimista (sin lock) para dar feedback rápido antes de intentar escribir.
        // El chequeo real y definitivo, con lock por fila, pasa dentro de descontar() más abajo.
        $faltantes = $stockService->validarDisponibilidad($itemsParaValidarMerged);

        if (! empty($faltantes)) {
            $this->abortarPorStockInsuficiente($faltantes);
        }

        try {
            $pedido = DB::transaction(function () use ($validated, $pricingService, $stockService, $codigoDescuentoService, $recargoPagoService) {
                $productos = Producto::with(['escalasPrecio', 'ofertaVigente'])
                    ->whereIn('id', collect($validated['items'])->pluck('producto_id'))
                    ->get()
                    ->keyBy('id');

                // Una misma compra puede traer varias líneas del mismo producto (una
                // por color elegido en el repartidor de la ficha). El precio por
                // cantidad se resuelve sobre el TOTAL de unidades de ese producto en
                // el pedido, no sobre la cantidad de cada línea suelta — ver
                // PricingService::calcularPrecio ($cantidadParaEscala).
                $cantidadPorProducto = collect($validated['items'])
                    ->groupBy('producto_id')
                    ->map(fn ($grupo) => (int) collect($grupo)->sum('cantidad'));

                $subtotal = 0;
                $itemsData = [];

                foreach ($validated['items'] as $item) {
                    $producto = $productos->get($item['producto_id']);
                    $varianteId = $item['variante_id'] ?? null;
                    $addonsInput = collect($item['addons'] ?? []);

                    // Si el producto tiene variantes activas, elegir una no es opcional: sin
                    // esto, un item que llega sin variante_id (ej. el "Agregar" rápido del
                    // catálogo, que nunca pasa por el selector de color de la ficha) se
                    // vendería al precio base, sin recargo, sin descontar el stock real de
                    // ninguna variante y sin registrar qué color preparar. Corre ANTES de
                    // calcularPrecio() a propósito: un item inválido no debe llegar a tocar
                    // precio ni stock. No distingue es_color_personalizado de una variante
                    // fija — cualquier variante activa configurada es obligatoria.
                    if ($varianteId === null && $producto->variantesActivas()->exists()) {
                        throw ValidationException::withMessages([
                            'variante_id' => "Elegí un color para \"{$producto->titulo}\" antes de confirmar el pedido.",
                        ]);
                    }

                    // calcularPrecio() valida acá mismo (con 422 si corresponde) que la
                    // variante y cada addon pertenezcan a este producto y estén activos —
                    // ver PricingService::resolverVariante/resolverAddons. Nunca se confía
                    // en nombre/precio que pudo mandar el frontend. exigirVariante: true es
                    // la misma regla de arriba, como defensa en profundidad por si algún día
                    // otra vía llega hasta acá sin pasar por el guard explícito.
                    $priceResult = $pricingService->calcularPrecio(
                        $producto,
                        $item['cantidad'],
                        $varianteId,
                        $addonsInput->pluck('addon_id')->all(),
                        exigirVariante: true,
                        cantidadParaEscala: $cantidadPorProducto[$item['producto_id']]
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

                    // Si la variante elegida es "Otro / a elección del cliente" (ver
                    // ProductoVariante::esPersonalizada), el color real pedido no vive en la
                    // variante sino en este texto libre — sin él quien despache no sabe qué
                    // preparar, así que se rechaza el item entero en vez de guardarlo vacío.
                    $colorPersonalizadoTexto = null;

                    if ($priceResult->variante_aplicada?->esPersonalizada()) {
                        $colorPersonalizadoTexto = trim((string) ($item['color_personalizado_texto'] ?? ''));

                        if ($colorPersonalizadoTexto === '') {
                            throw ValidationException::withMessages([
                                'color_personalizado_texto' => "Para \"{$priceResult->variante_aplicada->nombre}\" en {$producto->titulo} tenés que indicar el color o una descripción de lo que necesitás.",
                            ]);
                        }
                    }

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
                        'color_personalizado_texto' => $colorPersonalizadoTexto,
                    ];
                }

                // Líneas de combo: se resuelve cada una otra vez acá (fresca, dentro de la
                // transacción) en vez de reusar $combosResueltos de afuera — mismo criterio
                // que el resto del método, que recarga productos/ofertas fresh en vez de
                // confiar en el chequeo optimista previo.
                foreach ($validated['combos'] ?? [] as $comboInput) {
                    $resuelto = $this->resolverLineaCombo($comboInput);
                    $combo = $resuelto['combo'];
                    $cantidadCombo = $resuelto['cantidad'];

                    $precioCombo = $pricingService->calcularPrecioCombo($combo, $cantidadCombo);

                    $comboSubtotal = round($precioCombo->precio_unitario_final * $cantidadCombo, 2);
                    $subtotal += $comboSubtotal;

                    $itemsData[] = [
                        'combo_id' => $combo->id,
                        'combo_items_seleccionados' => $resuelto['componentes'],
                        'titulo' => $combo->titulo,
                        'precio_unitario' => $precioCombo->precio_unitario_final,
                        'cantidad' => $cantidadCombo,
                        'subtotal' => $comboSubtotal,
                        'precio_base_unitario' => $precioCombo->precio_lista,
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

                $total = round($subtotal - $datosDescuento['descuento_monto'], 2);

                // Igual criterio que el código de descuento: el plan que manda el frontend es
                // solo una preselección de UX, nunca la fuente de verdad. Se resuelve y valida
                // acá, dentro de la transacción, contra el total ya recalculado server-side —
                // nunca se calcula el recargo sobre un total que mande el frontend.
                $datosPlanPago = [
                    'plan_pago_tarjeta_id' => null,
                    'plan_pago_nombre' => null,
                    'plan_pago_cuotas' => null,
                    'recargo_porcentaje' => null,
                    'recargo_monto' => null,
                    'total_con_recargo' => null,
                ];

                if (! empty($validated['plan_pago_tarjeta_id'])) {
                    $plan = PlanPagoTarjeta::find($validated['plan_pago_tarjeta_id']);

                    if ($plan === null || ! $plan->is_active) {
                        throw ValidationException::withMessages([
                            'plan_pago_tarjeta_id' => 'Esta forma de pago ya no está disponible. Elegí otra o pagá en efectivo/transferencia.',
                        ]);
                    }

                    $recargo = $recargoPagoService->calcular($total, $plan);

                    $datosPlanPago = [
                        'plan_pago_tarjeta_id' => $plan->id,
                        'plan_pago_nombre' => $plan->nombre,
                        'plan_pago_cuotas' => $plan->cuotas,
                        'recargo_porcentaje' => $plan->recargo_porcentaje,
                        'recargo_monto' => $recargo['recargo_monto'],
                        'total_con_recargo' => $recargo['total_con_recargo'],
                    ];
                }

                // Snapshot de envío gratis: el monto mínimo es global y puede cambiar, pero el
                // pedido tiene que seguir diciendo si calificó con el que regía al comprar.
                // Igual criterio que el front (Checkout.jsx): sobre el subtotal, antes de
                // descuento/recargo; mínimo <= 0 = feature desactivada.
                $montoMinimoEnvio = (float) ConfiguracionEnvio::obtener()->monto_minimo;

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
                    'total' => $total,
                    'estado' => EstadoPedido::Pendiente,
                    'sucursal' => Sucursal::tryFrom($validated['sucursal'] ?? '') ?? Sucursal::BuenosAires,
                    'codigo_descuento_id' => $datosDescuento['codigo_descuento_id'],
                    'codigo_descuento_texto' => $datosDescuento['codigo_descuento_texto'],
                    'codigo_descuento_tipo' => $datosDescuento['codigo_descuento_tipo'],
                    'codigo_descuento_valor' => $datosDescuento['codigo_descuento_valor'],
                    'descuento_monto' => $datosDescuento['descuento_monto'],
                    'envio_gratis' => $montoMinimoEnvio > 0 && $subtotal >= $montoMinimoEnvio,
                    'envio_gratis_monto_minimo' => $montoMinimoEnvio,
                    ...$datosPlanPago,
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
        } catch (VarianteRequeridaException $e) {
            // No debería alcanzarse nunca: el guard explícito de arriba ya corta antes de
            // llegar a PricingService. Si esto se dispara, es la defensa en profundidad
            // funcionando — mismo shape de error 422 que el resto del endpoint.
            $titulo = Producto::find($e->productoId)?->titulo ?? 'este producto';

            throw ValidationException::withMessages([
                'variante_id' => "Elegí un color para \"{$titulo}\" antes de confirmar el pedido.",
            ]);
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
     * Resuelve una línea de combo del request ({combo_id, cantidad, selecciones}) contra
     * su receta real (combo_productos): por cada item, usa la variante fija del admin si
     * la hay; si no, busca la elegida por el comprador en `selecciones` (por
     * combo_producto_id) y valida que sea una variante activa de ESE producto — mismo
     * criterio de "no confiar en el frontend" que PricingService::resolverVariante. Si el
     * producto no tiene variantes activas, no hace falta ninguna selección.
     *
     * Devuelve el combo cargado, la cantidad de combos pedida, y el snapshot de
     * componentes ya resuelto (`combo_items_seleccionados`) con las cantidades totales
     * (cantidad de receta × cantidad de combos) listas para precio/stock.
     *
     * @return array{combo: Combo, cantidad: int, componentes: array<int, array{producto_id: int, producto_variante_id: ?int, titulo: string, variante_nombre: ?string, variante_color_hex: ?string, cantidad_por_combo: int, cantidad_total: int}>}
     */
    private function resolverLineaCombo(array $comboInput): array
    {
        $combo = Combo::with(['items.producto.variantesActivas', 'items.productoVariante'])
            ->find($comboInput['combo_id']);

        if ($combo === null || ! $combo->is_active) {
            throw ValidationException::withMessages([
                'combos' => 'Uno de los combos elegidos ya no está disponible.',
            ]);
        }

        $cantidadCombo = (int) $comboInput['cantidad'];
        $seleccionesInput = collect($comboInput['selecciones'] ?? [])->keyBy('combo_producto_id');

        $componentes = [];

        foreach ($combo->items as $item) {
            $varianteResuelta = null;

            if ($item->producto_variante_id !== null) {
                $varianteResuelta = $item->productoVariante;
            } elseif ($item->producto->variantesActivas->isNotEmpty()) {
                $varianteIdElegida = $seleccionesInput->get($item->id)['variante_id'] ?? null;

                if ($varianteIdElegida !== null) {
                    $varianteResuelta = $item->producto->variantesActivas->firstWhere('id', (int) $varianteIdElegida);
                }

                if ($varianteResuelta === null) {
                    throw ValidationException::withMessages([
                        'combos' => "Elegí un color para \"{$item->producto->titulo}\" dentro del combo \"{$combo->titulo}\".",
                    ]);
                }
            }

            $componentes[] = [
                'producto_id' => $item->producto_id,
                'producto_variante_id' => $varianteResuelta?->id,
                'titulo' => $item->producto->titulo,
                'variante_nombre' => $varianteResuelta?->nombre,
                'variante_color_hex' => $varianteResuelta?->color_hex,
                'cantidad_por_combo' => $item->cantidad,
                'cantidad_total' => $item->cantidad * $cantidadCombo,
            ];
        }

        return ['combo' => $combo, 'cantidad' => $cantidadCombo, 'componentes' => $componentes];
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
