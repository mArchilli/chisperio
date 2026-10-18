<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Enums\Sucursal;
use App\Exceptions\StockInsuficienteException;
use App\Exceptions\VarianteRequeridaException;
use App\Models\Combo;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Services\CalculadoraPedido;
use App\Services\CodigoDescuentoService;
use App\Services\ComboPedidoResolver;
use App\Services\PedidoEdicionService;
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

        $pedidos = Pedido::with('items')
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
                // Ventas = pedidos en estado de venta cerrada (EstadoPedido::estadosDeVenta());
                // los pendientes van aparte y los cancelados no suman nunca.
                'unidades_vendidas' => (int) PedidoItem::whereHas(
                    'pedido',
                    fn ($query) => $query->ventas()->deSucursal($sucursalScope)
                )->sum('cantidad'),
                'facturacion' => (float) Pedido::ventas()->deSucursal($sucursalScope)->sum('total'),
                'pendientes_monto' => (float) Pedido::pendientes()->deSucursal($sucursalScope)->sum('total'),
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
     * Pantalla de edición de un pedido (admin y vendedor de la sucursal). Se editan los
     * pedidos pendientes y los despachados (ver EstadoPedido::esEditable); uno cancelado
     * ya repuso su stock y es terminal.
     */
    public function edit(Request $request, Pedido $pedido, PricingService $pricingService)
    {
        $this->autorizarSucursal($request, $pedido);

        if (! $pedido->estado->esEditable()) {
            return redirect()
                ->route('pedidos.show', $pedido)
                ->with('error', 'Un pedido cancelado no se puede editar.');
        }

        $pedido->load('items.producto.imagenPrincipal');

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

        // Catálogo para sumar líneas al pedido. Con el mismo shape que la ficha pública
        // (variantes/add-ons activos, escalas y oferta) para sugerir el precio con
        // resolverPrecio() en el cliente; el precio final lo sigue fijando quien edita.
        $productosCatalogo = Producto::where('is_active', true)
            ->with([
                'imagenPrincipal',
                'ofertaVigente',
                'escalasPrecio',
                'variantes' => fn ($query) => $query->where('is_active', true),
                'addons' => fn ($query) => $query->where('addons.is_active', true)->orderBy('producto_addon.orden'),
            ])
            ->orderBy('titulo')
            ->get();

        $combosCatalogo = Combo::where('is_active', true)
            ->with(['imagenPrincipal', 'items.producto.variantesActivas', 'items.productoVariante'])
            ->orderBy('titulo')
            ->get()
            ->each(fn (Combo $combo) => $combo->setAttribute(
                'precio_sugerido',
                $pricingService->calcularPrecioCombo($combo, 1)->precio_unitario_final
            ));

        return Inertia::render('Admin/Pedidos/Edit', [
            'pedido' => $pedido,
            'variantesPorProducto' => $variantesPorProducto,
            'productosCatalogo' => $productosCatalogo,
            'combosCatalogo' => $combosCatalogo,
        ]);
    }

    /**
     * Guarda la edición de un pedido (pendiente o despachado). La lógica de items/totales/stock vive en
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
            // Las líneas existentes que siguen en el pedido (las que no vienen se quitan) y las
            // nuevas que se suman. Que quede al menos una lo valida el servicio, porque
            // depende de las dos listas juntas.
            'items' => 'nullable|array',
            'items.*.id' => 'required|integer|distinct',
            'items.*.cantidad' => 'required|integer|min:1|max:100000',
            'items.*.precio_unitario' => 'required|numeric|min:0|max:99999999',
            'items.*.variante_id' => 'nullable|integer',
            'items.*.color_personalizado_texto' => 'nullable|string|max:255',
            'items.*.addons_textos' => 'nullable|array',
            'items.*.addons_textos.*' => 'nullable|string|max:1000',
            'items.*.componentes_variantes' => 'nullable|array',
            'items.*.componentes_variantes.*' => 'nullable|integer',
            'nuevos_items' => 'nullable|array',
            'nuevos_items.*.tipo' => ['required', Rule::in(['producto', 'combo'])],
            'nuevos_items.*.producto_id' => 'required_if:nuevos_items.*.tipo,producto|nullable|integer|exists:productos,id',
            'nuevos_items.*.combo_id' => 'required_if:nuevos_items.*.tipo,combo|nullable|integer|exists:combos,id',
            'nuevos_items.*.cantidad' => 'required|integer|min:1|max:100000',
            'nuevos_items.*.precio_unitario' => 'nullable|numeric|min:0|max:99999999',
            'nuevos_items.*.variante_id' => 'nullable|integer',
            'nuevos_items.*.color_personalizado_texto' => 'nullable|string|max:255',
            'nuevos_items.*.addons' => 'nullable|array',
            'nuevos_items.*.addons.*.addon_id' => 'required|integer',
            'nuevos_items.*.addons.*.texto_personalizado' => 'nullable|string|max:1000',
            'nuevos_items.*.selecciones' => 'nullable|array',
            'nuevos_items.*.selecciones.*.combo_producto_id' => 'required|integer',
            'nuevos_items.*.selecciones.*.variante_id' => 'nullable|integer',
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
    public function store(Request $request, StockService $stockService, CalculadoraPedido $calculadora, CodigoDescuentoService $codigoDescuentoService)
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
            $pedido = DB::transaction(function () use ($validated, $calculadora, $stockService, $codigoDescuentoService) {
                // Todo el cálculo (precios, escalas, ofertas, combos, cupón, recargo, envío
                // gratis) vive en CalculadoraPedido y no escribe nada. Acá adentro se llama
                // con el cupón lockeado: la validación y el consumo del cupo tienen que
                // ocurrir bajo el mismo lock para que dos checkouts concurrentes sobre un
                // código con limite_usos=1 no pasen ambos.
                $calculo = $calculadora->calcular($validated, bloquearCupon: true);

                $pedido = Pedido::create([
                    'cliente_nombre' => $validated['cliente_nombre'],
                    'cliente_dni' => $validated['cliente_dni'] ?? null,
                    'cliente_telefono' => $validated['cliente_telefono'] ?? null,
                    'cliente_email' => $validated['cliente_email'] ?? null,
                    'cliente_provincia' => $validated['cliente_provincia'] ?? null,
                    'cliente_ciudad' => $validated['cliente_ciudad'] ?? null,
                    'cliente_codigo_postal' => $validated['cliente_codigo_postal'] ?? null,
                    'observaciones' => $validated['observaciones'] ?? null,
                    'estado' => EstadoPedido::Pendiente,
                    'sucursal' => Sucursal::tryFrom($validated['sucursal'] ?? '') ?? Sucursal::BuenosAires,
                    ...$calculo->atributosPedido(),
                ]);

                $pedido->items()->createMany($calculo->items);

                // Recién con el pedido ya creado consumimos el cupo: si algo de lo que sigue
                // falla (stock insuficiente más abajo), el rollback de la transacción
                // deshace también este increment junto con todo lo demás.
                $codigoDescuentoService->consumirUso($pedido);

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
                'variante_id' => $e->varianteId,
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
     * Resuelve una línea de combo del request contra su receta (ver ComboPedidoResolver,
     * compartido con la edición de pedidos).
     */
    private function resolverLineaCombo(array $comboInput): array
    {
        return app(ComboPedidoResolver::class)->resolverLinea($comboInput);
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
        $colores = ProductoVariante::whereIn('id', collect($faltantes)->pluck('variante_id')->filter())->pluck('nombre', 'id');

        $mensajes = [];

        foreach ($faltantes as $faltante) {
            $titulo = $titulos->get($faltante['producto_id'], 'este producto');

            // Con variante se nombra el color: "Chispa PULY (Dorada)", así el cliente sabe cuál sacar o ajustar.
            if (! empty($faltante['variante_id']) && $colores->has($faltante['variante_id'])) {
                $titulo .= ' (' . $colores->get($faltante['variante_id']) . ')';
            }

            // Una lista por producto: dos colores del mismo producto sin stock no se pisan entre sí.
            $mensajes["stock.{$faltante['producto_id']}"][] = $faltante['stock_disponible'] > 0
                ? "Solo quedan {$faltante['stock_disponible']} unidades de {$titulo} (pediste {$faltante['cantidad']}). Ajustá la cantidad."
                : "No queda stock de {$titulo}.";
        }

        throw ValidationException::withMessages($mensajes);
    }
}
