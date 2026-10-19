<?php

namespace App\Http\Controllers;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Enums\Sucursal;
use App\Exceptions\StockInsuficienteException;
use App\Exceptions\VarianteRequeridaException;
use App\DataTransferObjects\CalculoPedido;
use App\Models\Combo;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Rukoz\CheckoutCentral;
use App\Rukoz\ConfirmacionDeVenta;
use App\Rukoz\ErroresDelCentral;
use App\Rukoz\EspejoStock;
use App\Rukoz\PedidoArmado;
use App\Rukoz\PedidoParaCentral;
use App\Rukoz\ReservaDePedido;
use App\Services\CalculadoraPedido;
use App\Services\CodigoDescuentoService;
use App\Services\ComboPedidoResolver;
use App\Services\PedidoEdicionService;
use App\Services\PricingService;
use App\Services\StockService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Rukoz\CoreClient\Errores\CentralNoDisponibleException;
use Rukoz\CoreClient\Errores\RukozException;
use Rukoz\CoreClient\Errores\SinStockException;
use Rukoz\CoreClient\Facades\Rukoz;

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
            // «Confirmados» incluye a los ya empaquetados (siguen sin despachar); cada fila muestra su estado exacto.
            ->when($filtroEstado === EstadoPedido::Confirmado->value, fn ($query) => $query->whereIn('estado', [EstadoPedido::Confirmado->value, EstadoPedido::Empaquetado->value]))
            ->when($filtroEstado !== 'todos' && $filtroEstado !== EstadoPedido::Confirmado->value, fn ($query) => $query->where('estado', $filtroEstado))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        // 11.4 — Las acciones que ofrece cada fila (un pedido con reserva en el Central no se despacha a mano: se confirma).
        $pedidos->getCollection()->transform(fn (Pedido $pedido) => $pedido->setAttribute('permisos', [
            'puede_confirmar' => $pedido->puedeConfirmarse(),
            'puede_marcar_despachado' => $pedido->puedeTransicionarA(EstadoPedido::Despachado),
            'puede_cancelar' => $pedido->puedeTransicionarA(EstadoPedido::Cancelado),
            'puede_volver_a_pendiente' => $pedido->puedeTransicionarA(EstadoPedido::Pendiente),
        ]));

        return Inertia::render('Admin/Pedidos/Index', [
            'pedidos' => $pedidos,
            'filtroEstado' => $filtroEstado,
            'filtroSucursal' => $filtroSucursal,
            'puedeFiltrarSucursal' => $esAdmin,
            'stats' => [
                'pendientes_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Pendiente)->count(),
                'despachados_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Despachado)->count(),
                // 11.4 — Estados que llegan del Central: la venta confirmada, todavía sin despachar, y la anulada.
                'confirmados_count' => Pedido::deSucursal($sucursalScope)->whereIn('estado', [EstadoPedido::Confirmado->value, EstadoPedido::Empaquetado->value])->count(),
                'entregados_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Entregado)->count(),
                'anulados_count' => Pedido::deSucursal($sucursalScope)->where('estado', EstadoPedido::Anulado)->count(),
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
            // 11.4 — Qué acciones ofrece la ficha. El backend las vuelve a exigir en cada endpoint.
            'permisos' => [
                'puede_confirmar' => $pedido->puedeConfirmarse(),
                'puede_editar' => $pedido->esEditable(),
                'puede_marcar_despachado' => $pedido->puedeTransicionarA(EstadoPedido::Despachado),
                'puede_cancelar' => $pedido->puedeTransicionarA(EstadoPedido::Cancelado),
                'puede_volver_a_pendiente' => $pedido->puedeTransicionarA(EstadoPedido::Pendiente),
                'es_venta_del_central' => $pedido->estaConfirmado(),
            ],
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

        if (! $pedido->esEditable()) {
            return redirect()
                ->route('pedidos.show', $pedido)
                ->with('error', PedidoEdicionService::motivoDeSoloLectura($pedido));
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

        // 11.4 — Un pedido confirmado (o anulado, cancelado) es de solo lectura también en el backend, antes de validar nada.
        if (! $pedido->esEditable()) {
            throw ValidationException::withMessages(['estado' => PedidoEdicionService::motivoDeSoloLectura($pedido)]);
        }

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
    public function cambiarEstado(Request $request, Pedido $pedido, StockService $stockService, CodigoDescuentoService $codigoDescuentoService, ReservaDePedido $reservaDePedido)
    {
        $this->autorizarSucursal($request, $pedido);

        $validated = $request->validate([
            'estado' => ['required', new Enum(EstadoPedido::class)],
            'motivo' => ['nullable', 'string', 'max:500'],
        ]);

        $estadoActual = $pedido->estado;
        $estadoDestino = EstadoPedido::from($validated['estado']);

        if (! $pedido->puedeTransicionarA($estadoDestino)) {
            throw ValidationException::withMessages([
                'estado' => $this->mensajeTransicionInvalida($pedido, $estadoDestino),
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

        if ($estadoDestino === EstadoPedido::Cancelado && $pedido->usaCentral()) {
            // El stock lo tiene reservado el Central: se cancela la reserva allá (HTTP, sin transacción abierta) y después
            // se cancela el pedido local liberando el cupón. No se repone stock local (nunca se descontó). Si el Central no
            // responde, la cancelación queda en las compensaciones del paquete y el pedido local queda cancelado igual.
            $reservaDePedido->cancelar($pedido, $validated['motivo'] ?? 'Cancelado desde el panel de Chisperío');
        } elseif ($estadoDestino === EstadoPedido::Cancelado) {
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
    private function mensajeTransicionInvalida(Pedido $pedido, EstadoPedido $destino): string
    {
        $actual = $pedido->estado;

        // 11.4 — Una venta confirmada (o anulada) en el Central no se toca desde la web.
        if ($pedido->estaConfirmado() || $actual === EstadoPedido::Anulado) {
            return $destino === EstadoPedido::Cancelado || $actual === EstadoPedido::Anulado
                ? 'Para anular, hacelo en el Sistema Central.'
                : 'Este pedido ya es una venta confirmada en el Sistema Central: su estado lo maneja el Central (empaquetado y despacho se hacen allá).';
        }

        if ($destino === EstadoPedido::Despachado && $pedido->usaCentral() && ConfirmacionDeVenta::activa()) {
            return 'Este pedido tiene su stock en el Sistema Central: se confirma como venta con «Confirmar venta» (y el despacho se hace en el Central).';
        }

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

        // Con el checkout del Central activo el pedido reserva ALLÁ antes de guardarse y la web no toca su stock; si no,
        // es el flujo de siempre (stock local, todo en una transacción).
        if (CheckoutCentral::activo()) {
            return $this->storeConReserva($validated, $calculadora, $codigoDescuentoService, $stockService);
        }

        return $this->storeLocal($validated, $calculadora, $codigoDescuentoService, $stockService);
    }

    /**
     * Flujo de siempre: el pedido, el cupón y el descuento de stock local en una sola transacción.
     */
    private function storeLocal(array $validated, CalculadoraPedido $calculadora, CodigoDescuentoService $codigoDescuentoService, StockService $stockService): JsonResponse
    {
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
     * Checkout con el Central (11.3). Orden:
     *  1. CalculadoraPedido: precios, cupón validado SIN consumir (ni lockear), ítems y totales.
     *  2. La referencia externa (`rukoz_ref`) se genera ANTES de reservar y es la clave de idempotencia: un doble clic o un
     *     reintento reutiliza el mismo intento (ver CheckoutCentral) y no crea dos reservas.
     *  3. Rukoz::reservar() — HTTP, afuera de toda transacción.
     *  4. Reserva OK → transacción local (con HTTP prohibido): se revalida el cupón con lock, se crea el pedido con su
     *     `rukoz_ref` y se consume el cupo. NO se descuenta stock local: lo reservó el Central. Si la transacción falla,
     *     el paquete cancela la reserva (o la deja en compensaciones) y vuelve a lanzar la excepción.
     */
    private function storeConReserva(array $validated, CalculadoraPedido $calculadora, CodigoDescuentoService $codigoDescuentoService, StockService $stockService): JsonResponse
    {
        $calculo = $calculadora->calcular($validated);
        $armador = app(PedidoParaCentral::class);

        $datosPedido = [
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
        ];

        // Modelos en memoria: sirven para armar el pedido del Central antes de que exista en la base.
        $pedidoEnMemoria = new Pedido($datosPedido);
        $itemsEnMemoria = collect($calculo->items)->map(fn (array $item) => new PedidoItem($item));

        $contenido = $armador->armar($pedidoEnMemoria, $itemsEnMemoria, now())->payload;
        unset($contenido['creado_at']);
        $huella = CheckoutCentral::huella($contenido);

        try {
            return Cache::lock(CheckoutCentral::claveLock($huella), 90)->block(
                30,
                fn () => $this->reservarYCrear($validated, $calculo, $datosPedido, $pedidoEnMemoria, $itemsEnMemoria, $huella, $codigoDescuentoService, $calculadora, $stockService)
            );
        } catch (LockTimeoutException) {
            // El mismo pedido sigue en curso en otro request (un doble clic): no se hace nada de más.
            return response()->json(['message' => 'Tu pedido ya se está procesando. Esperá unos segundos.'], 409);
        }
    }

    private function reservarYCrear(array $validated, CalculoPedido $calculo, array $datosPedido, Pedido $pedidoEnMemoria, Collection $itemsEnMemoria, string $huella, CodigoDescuentoService $codigoDescuentoService, CalculadoraPedido $calculadora, StockService $stockService): JsonResponse
    {
        $intento = CheckoutCentral::intento($huella);

        // Este mismo pedido ya se creó (doble envío): se devuelve el que ya existe, sin reservar de nuevo.
        $existente = Pedido::query()
            ->when(
                $intento['pedido_id'] !== null,
                fn ($query) => $query->whereKey($intento['pedido_id']),
                fn ($query) => $query->where('rukoz_ref', $intento['ref'])
            )
            ->first();

        if ($existente !== null) {
            return response()->json(['id' => $existente->id, 'total' => $existente->total], 201);
        }

        $armador = app(PedidoParaCentral::class);
        $creadoAt = Carbon::parse($intento['creado_at']);
        $armado = $armador->armar($pedidoEnMemoria, $itemsEnMemoria, $creadoAt);

        try {
            $reserva = Rukoz::reservar($intento['ref'], $armado->payload, function (array $central) use ($validated, $calculo, $datosPedido, $intento, $creadoAt, $codigoDescuentoService) {
                // Dentro de la transacción del paquete: solo base local, nada de HTTP.
                // El cupón se revalida AHORA con lock: el límite de usos se decide bajo el mismo lock que su consumo. Si
                // en el medio cambió (se agotó, venció, otro checkout se llevó el último uso), se aborta y el paquete
                // cancela la reserva que se acababa de hacer.
                $descuento = $codigoDescuentoService->resolverParaCheckout(
                    $validated['codigo_descuento'] ?? null,
                    $calculo->subtotal,
                    bloquear: true
                );

                if (round((float) $descuento['descuento_monto'], 2) !== round((float) $calculo->descuento['descuento_monto'], 2)) {
                    throw ValidationException::withMessages([
                        'codigo_descuento' => 'El descuento del código cambió mientras confirmábamos el pedido. Revisá el carrito e intentá de nuevo.',
                    ]);
                }

                $pedido = new Pedido($datosPedido + [
                    'rukoz_ref' => $intento['ref'],
                    'rukoz_version' => $central['version'] ?? null,
                    'rukoz_estado' => $central['estado'] ?? Pedido::RESERVA_RESERVADA,
                ]);
                // Lo que el Central recibió como `creado_at`: así un PUT posterior manda la misma hora.
                $pedido->created_at = $creadoAt;
                $pedido->save();

                $pedido->items()->createMany($calculo->items);

                // Sin StockService::descontar(): el stock lo reservó el Central.
                $codigoDescuentoService->consumirUso($pedido);

                return $pedido;
            });
        } catch (SinStockException $e) {
            CheckoutCentral::olvidarIntento($huella);
            // El espejo estaba desactualizado: se relee el stock de esos ítems para que la tienda deje de ofrecerlos.
            EspejoStock::refrescar(ErroresDelCentral::paresParaRefrescar($e, $armado));

            $mensajes = [];

            foreach (ErroresDelCentral::sinStock($e, $armado) as $falta) {
                $mensajes[$falta['clave']][] = $falta['mensaje'];
            }

            throw ValidationException::withMessages($mensajes);
        } catch (CentralNoDisponibleException $e) {
            // Caído, timeout o circuito abierto: no se sabe si reservó. El intento (y su ref) se conserva: el reintento del
            // cliente es idempotente.
            if (CheckoutCentral::permiteVenderSinReserva()) {
                return $this->storeLocal($validated, $calculadora, $codigoDescuentoService, $stockService);
            }

            return response()->json([
                'message' => ErroresDelCentral::MENSAJE_CENTRAL_CAIDO,
                'central_no_disponible' => true,
            ], 503);
        } catch (RukozException $e) {
            // Sin vincular, selección inválida, validación, etc.: es un problema de catálogo, no de quien compra.
            CheckoutCentral::olvidarIntento($huella);
            ErroresDelCentral::registrar($e, 'reservar el pedido');

            throw ValidationException::withMessages([
                'pedido' => 'Uno de los productos no está disponible por el momento. Escribinos por WhatsApp y lo resolvemos.',
            ]);
        }

        /** @var Pedido $pedido */
        $pedido = $reserva->local;

        CheckoutCentral::intentoCompletado($huella, $intento, $pedido->id);

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
