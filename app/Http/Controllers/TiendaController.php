<?php

namespace App\Http\Controllers;

use App\DataTransferObjects\ComboPriceResult;
use App\DataTransferObjects\PriceResult;
use App\Models\Categoria;
use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\EscalaPrecio;
use App\Models\Producto;
use App\Models\Resena;
use App\Services\PricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

class TiendaController extends Controller
{
    public function show(Producto $producto, PricingService $pricingService)
    {
        abort_if(!$producto->is_active, 404);

        $producto->load([
            'imagenes',
            'videos',
            'imagenPrincipal',
            'ofertaVigente',
            'categorias',
            'subcategorias',
            'escalasPrecio',
            // Solo variantes/add-ons activos: son las únicas opciones que el cliente puede
            // elegir en la ficha (ver VarianteColorSwatches/ProductoAddonsChecklist). Una
            // variante/addon desactivado no se ofrece, no solo se deshabilita.
            'variantes' => fn ($query) => $query->where('is_active', true),
            'addons' => fn ($query) => $query->where('addons.is_active', true)->orderBy('producto_addon.orden'),
        ]);

        $escalasPrecio = $producto->escalasPrecio->map(fn (EscalaPrecio $escala) => [
            'id' => $escala->id,
            'cantidad_minima' => $escala->cantidad_minima,
            'precio_unitario' => (float) $escala->precio_unitario,
        ])->values();

        $precioActual = $this->serializarPrecio($pricingService->calcularPrecio($producto, 1));

        // La relación cargada se serializaría con el shape completo de EscalaPrecio bajo
        // la misma clave 'escalas_precio'; la quitamos para que prevalezca el array recortado.
        $producto->unsetRelation('escalasPrecio');
        $producto->setAttribute('escalas_precio', $escalasPrecio);
        $producto->setAttribute('precio_actual', $precioActual);

        $categoriaIds = $producto->categorias->pluck('id');

        $relacionados = Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias', 'variantesActivas.mediaEspecifica' => fn ($q) => $q->where('tipo', 'imagen')->orderBy('orden')])
            ->where('is_active', true)
            ->where('id', '!=', $producto->id)
            ->conStock()
            ->when($categoriaIds->isNotEmpty(), fn ($q) =>
                $q->whereHas('categorias', fn ($q2) =>
                    $q2->whereIn('categorias.id', $categoriaIds)
                )
            )
            ->limit(6)
            ->get();

        if ($relacionados->isEmpty()) {
            $relacionados = Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias', 'variantesActivas.mediaEspecifica' => fn ($q) => $q->where('tipo', 'imagen')->orderBy('orden')])
                ->where('is_active', true)
                ->where('id', '!=', $producto->id)
                ->conStock()
                ->where('is_featured', true)
                ->limit(6)
                ->get();
        }

        return Inertia::render('ShowProduct', [
            'producto'    => $producto,
            'relacionados' => $relacionados,
            'resenas'     => $this->resenasAleatorias(),
            'canLogin'    => Route::has('login'),
        ]);
    }

    /**
     * Productos que se ofrecen en el carrito y en el modal del carrito (JSON). El carrito
     * vive en el navegador, así que el cliente manda los ids de producto que tiene
     * (`?productos[]=`) y acá se arma la lista:
     *
     *  1. Compatibles: los productos que el admin marcó como compatibles con alguno del
     *     carrito (producto_compatible, relación simétrica: una pistola PULY® sugiere su
     *     chispa fría y esa chispa sugiere la pistola). Si un producto es compatible con
     *     varios del carrito va primero; a igual cantidad, manda el orden que eligió el admin.
     *     Cada uno viaja con `compatible_con`: títulos de lo del carrito con lo que sirve.
     *  2. "Sugerir siempre" (productos.sugerir_en_carrito, p. ej. chispas frías genéricas),
     *     solo si NINGÚN producto del carrito tiene compatibilidad definida: si el cliente
     *     lleva algo con compatibilidad (una pistola PULY®), una chispa genérica podría no
     *     servirle, así que no se mezcla.
     *
     * Nunca devuelve un producto que ya está en el carrito, inactivo o sin stock.
     */
    public function sugerenciasCarrito(Request $request)
    {
        $request->validate([
            'productos' => 'array|max:50',
            'productos.*' => 'integer',
        ]);

        $enCarrito = collect($request->input('productos', []))->map(fn ($id) => (int) $id)->unique()->values();

        if ($enCarrito->isEmpty()) {
            return response()->json(['productos' => []]);
        }

        $limite = 4;

        $pares = DB::table('producto_compatible')
            ->where(fn ($q) => $q->whereIn('producto_id', $enCarrito)->orWhereIn('compatible_id', $enCarrito))
            ->get(['producto_id', 'compatible_id', 'orden']);

        // candidato => ids del carrito con los que es compatible, y el menor `orden` visto.
        $compatibilidad = [];
        foreach ($pares as $par) {
            foreach ([[$par->producto_id, $par->compatible_id], [$par->compatible_id, $par->producto_id]] as [$delCarrito, $candidato]) {
                if (! $enCarrito->contains($delCarrito) || $enCarrito->contains($candidato)) {
                    continue;
                }
                $compatibilidad[$candidato]['con'][$delCarrito] = true;
                $compatibilidad[$candidato]['orden'] = min($compatibilidad[$candidato]['orden'] ?? PHP_INT_MAX, $par->orden);
            }
        }

        $candidatos = fn () => Producto::with([
            'imagenPrincipal',
            'ofertaVigente',
            'escalasPrecio',
        ])
            ->withCount('variantesActivas')
            ->where('is_active', true)
            ->conStock()
            ->whereNotIn('id', $enCarrito);

        $elegidos = collect();

        if ($compatibilidad !== []) {
            $titulosCarrito = Producto::whereIn('id', $enCarrito)->pluck('titulo', 'id');

            $elegidos = $candidatos()->whereIn('id', array_keys($compatibilidad))->get()
                ->sortBy([
                    fn (Producto $a, Producto $b) => count($compatibilidad[$b->id]['con']) <=> count($compatibilidad[$a->id]['con']),
                    fn (Producto $a, Producto $b) => $compatibilidad[$a->id]['orden'] <=> $compatibilidad[$b->id]['orden'],
                    fn (Producto $a, Producto $b) => $a->id <=> $b->id,
                ])
                ->take($limite)
                ->each(fn (Producto $producto) => $producto->setAttribute(
                    'compatible_con',
                    collect(array_keys($compatibilidad[$producto->id]['con']))
                        ->map(fn ($id) => $titulosCarrito[$id] ?? null)
                        ->filter()
                        ->values()
                        ->all()
                ))
                ->values();
        }

        // Productos del carrito con compatibilidad definida, aunque todos sus compatibles
        // ya estén en el carrito o sin stock: tampoco ahí corresponde ofrecer genéricos.
        if ($pares->isEmpty() && $elegidos->count() < $limite) {
            $siempre = $candidatos()
                ->where('sugerir_en_carrito', true)
                ->orderBy('titulo')
                ->limit($limite - $elegidos->count())
                ->get();

            $elegidos = $elegidos->concat($siempre);
        }

        $elegidos->each(
            fn (Producto $producto) => $producto->setAttribute('tiene_variantes', $producto->variantes_activas_count > 0)
        );

        return response()->json(['productos' => $elegidos->values()]);
    }

    /**
     * Reseñas visibles elegidas al azar (y en orden aleatorio) para las fichas de producto y
     * de combo: cada visita muestra otras, así el cliente ve distintas opiniones y ninguna
     * queda fija. Son pocas filas, el ORDER BY RAND() es barato.
     */
    private function resenasAleatorias(int $cantidad = 3)
    {
        return Resena::activas()
            ->inRandomOrder()
            ->limit($cantidad)
            ->get(['id', 'nombre', 'meta', 'texto', 'puntuacion', 'fecha', 'color_avatar']);
    }

    /**
     * Ficha pública de un combo: mismo espíritu que show() para un producto, pero sin
     * escalas/add-ons (los combos no los tienen — ver Combo/ComboProducto). Carga los
     * items con el producto y sus variantes activas para que el frontend arme un
     * selector de color por cada item que ComboProducto::requiereSeleccionVariante().
     */
    public function showCombo(Combo $combo, PricingService $pricingService)
    {
        abort_if(! $combo->is_active, 404);

        $combo->load([
            'imagenes',
            'videos',
            'imagenPrincipal',
            'items.producto.variantesActivas',
            'items.productoVariante',
        ]);

        $precioActual = $this->serializarPrecioCombo($pricingService->calcularPrecioCombo($combo, 1));

        // El combo se ve como un producto para resolverPrecio() en el frontend (ver
        // serializarComboParaVidriera): sin escalas, y con oferta_vigente en la misma
        // forma tipo_descuento/valor_descuento/alcance que usa un producto.
        $combo->setAttribute('escalas_precio', []);
        $combo->setAttribute('oferta_vigente', $this->ofertaVigenteComboArray($combo));
        $combo->setAttribute('precio_actual', $precioActual);
        $combo->setAttribute('stock', $combo->stockDisponible());

        return Inertia::render('ShowCombo', [
            'combo' => $combo,
            'resenas' => $this->resenasAleatorias(),
            'canLogin' => Route::has('login'),
        ]);
    }

    public function index(Request $request)
    {
        // Los combos tienen su propia pestaña/filtro ("Combos", paginada). Además, en la
        // vista general (sin filtros) se listan primero, en una sección aparte arriba de
        // los productos — ver combosDestacadosEnListado().
        if ($request->filter === 'combos') {
            return $this->indexCombos($request);
        }

        // A diferencia de los "relacionados" de la ficha y los destacados de la home,
        // acá NO se usa conStock(): el catálogo tiene que listar también los productos
        // sin stock (marcados "Sin stock" y sin poder agregarse al carrito en el
        // frontend — ver Tienda.jsx), no ocultarlos.
        $query = Producto::with([
            'imagenPrincipal',
            'ofertaVigente',
            'categorias',
            'subcategorias',
            'escalasPrecio',
            // Colores activos para los swatches de la card, con su(s) foto(s) propia(s): al
            // elegir un color la card muestra la imagen de esa variante (misma idea que las
            // cards de "relacionados" de la ficha). El resto de la ficha (add-ons, etc.) no
            // se carga: esto es un listado.
            'variantesActivas.mediaEspecifica' => fn ($q) => $q->where('tipo', 'imagen')->orderBy('orden'),
        ])
            // Además de los colores, se cuenta cuántos hay activos: el "Agregar" rápido de la
            // card (Tienda.jsx) sabe así que tiene que mandar al cliente a elegir color en la
            // ficha en vez de agregar directo sin variante — ver PedidoController::store,
            // que rechaza justamente ese caso.
            ->withCount('variantesActivas')
            ->where('is_active', true);

        if ($request->filled('categoria')) {
            $query->whereHas('categorias', fn ($q) =>
                $q->where('categorias.id', $request->categoria)
            );
        }

        if ($request->filled('subcategoria')) {
            $query->whereHas('subcategorias', fn ($q) =>
                $q->where('subcategorias.id', $request->subcategoria)
            );
        }

        if ($request->filled('q')) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('titulo', 'like', "%{$search}%")
                    ->orWhere('descripcion', 'like', "%{$search}%");
            });
        }

        if ($request->filter === 'destacados') {
            $query->where('is_featured', true);
        } elseif ($request->filter === 'ofertas') {
            $query->whereHas('ofertas', fn ($q) => $this->ofertaVigente($q));
        }

        // Productos sin stock al final del listado (stock NULL = ilimitado siempre
        // cuenta como "con stock" acá, igual que Producto::scopeConStock), y dentro de cada
        // grupo el orden elegido (por defecto A → Z).
        $query->orderByRaw('CASE WHEN stock = 0 THEN 1 ELSE 0 END');
        $this->aplicarOrden($query, $request);

        $productos = $query
            ->paginate($this->porPagina($request))
            ->withQueryString();

        $productos->getCollection()->each(
            fn (Producto $producto) => $producto->setAttribute('tiene_variantes', $producto->variantes_activas_count > 0)
        );

        return Inertia::render('Tienda', [
            'combos'     => $this->combosParaListado($request),
            'productos'  => $productos,
            'categorias' => Categoria::with('subcategorias')->get(),
            'filters'    => $this->filtrosActivos($request),
            'disponibles' => $this->filtrosDisponibles(),
            'canLogin'   => Route::has('login'),
        ]);
    }

    /**
     * Combos que van en la sección "Combos" arriba de los productos, en la vista general
     * del catálogo. Solo cuando no hay ningún filtro de producto activo: un combo no tiene
     * categorías ni es "destacado/oferta" como un producto, así que filtrar por eso los
     * dejaría sin sentido. La búsqueda y el orden sí aplican. No se pagina: son pocos y
     * se muestran todos.
     *
     * @return array<int, array<string, mixed>>
     */
    private function combosParaListado(Request $request): array
    {
        $hayFiltroDeProducto = $request->filled('categoria')
            || $request->filled('subcategoria')
            || in_array($request->query('filter'), ['destacados', 'ofertas'], true);

        if ($hayFiltroDeProducto) {
            return [];
        }

        return $this->queryCombos($request)
            ->get()
            ->map(fn (Combo $combo) => $this->serializarComboParaVidriera($combo))
            ->all();
    }

    /** Combos activos, con la búsqueda (?q=) y el orden elegido ya aplicados. */
    private function queryCombos(Request $request)
    {
        $query = Combo::with(['imagenPrincipal', 'items.producto.variantesActivas', 'items.productoVariante'])
            ->where('is_active', true);

        if ($request->filled('q')) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('titulo', 'like', "%{$search}%")
                    ->orWhere('descripcion', 'like', "%{$search}%");
            });
        }

        $this->aplicarOrden($query, $request);

        return $query;
    }

    /**
     * Órdenes disponibles en la vidriera (clave de `?orden=` → columna y sentido).
     * `az` es el default y no viaja en la URL.
     */
    private const ORDENES = [
        'az' => ['titulo', 'asc'],
        'za' => ['titulo', 'desc'],
        'precio-asc' => ['precio', 'asc'],
        'precio-desc' => ['precio', 'desc'],
    ];

    private function ordenActivo(Request $request): string
    {
        $orden = $request->query('orden');

        return is_string($orden) && isset(self::ORDENES[$orden]) ? $orden : 'az';
    }

    /**
     * Aplica el orden elegido. El desempate por id es lo que mantiene estable la
     * paginación ("Cargar más"): sin él, productos con el mismo título/precio podrían
     * repetirse o saltearse entre tandas. El orden por precio es sobre el precio de lista
     * (precio base), no sobre el precio con oferta/escala aplicada.
     */
    private function aplicarOrden($query, Request $request): void
    {
        [$columna, $sentido] = self::ORDENES[$this->ordenActivo($request)];

        // El título se ordena en minúsculas para que "bengala" no quede después de "Pistola"
        // en motores con orden sensible a mayúsculas (SQLite); en MySQL ya es insensible.
        if ($columna === 'titulo') {
            $query->orderByRaw("LOWER(titulo) {$sentido}");
        } else {
            $query->orderBy($columna, $sentido)->orderByRaw('LOWER(titulo)');
        }

        $query->orderBy('id');
    }

    /** Filtros que vuelven al front; `orden` siempre presente para que la UI sepa cuál está activo. */
    private function filtrosActivos(Request $request): array
    {
        return [...$request->only(['categoria', 'subcategoria', 'filter', 'q']), 'orden' => $this->ordenActivo($request)];
    }

    /**
     * Tamaño de la tanda del catálogo ("Cargar más"). `paginas` permite pedir de una vez
     * varias tandas en la página 1: lo usa el botón "Volver al catálogo" de la ficha para
     * reconstruir el listado tal como el usuario lo dejó. Tiene que coincidir con
     * TIENDA_PAGE_SIZE en resources/js/lib/tiendaReturn.js.
     */
    private function porPagina(Request $request): int
    {
        return 24 * max(1, min(10, (int) $request->query('paginas', 1)));
    }

    /**
     * Qué filtros especiales tienen al menos un producto, para que la vidriera oculte
     * "Destacados"/"Ofertas" cuando no hay nada que mostrar.
     */
    private function filtrosDisponibles(): array
    {
        return [
            'destacados' => Producto::where('is_active', true)->where('is_featured', true)->exists(),
            'ofertas' => Producto::where('is_active', true)
                ->whereHas('ofertas', fn ($q) => $this->ofertaVigente($q))
                ->exists(),
        ];
    }

    private function ofertaVigente($query): void
    {
        $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('fecha_inicio')->orWhere('fecha_inicio', '<=', now()))
            ->where(fn ($q) => $q->whereNull('fecha_fin')->orWhere('fecha_fin', '>=', now()));
    }

    /**
     * Recalcula el precio de un producto para una cantidad (y opcionalmente variante
     * de color + add-ons) dados. Pensado para que el front (ficha de producto,
     * carrito) lo use como verificación real del cálculo que ya adelantó en cliente
     * con resources/js/lib/pricing.js, sin duplicar la lógica de PricingService en JS.
     *
     * variante_id/addon_ids son opcionales y, si vienen, se validan en el service
     * (PricingService::resolverVariante/resolverAddons): una variante o addon que no
     * pertenezca/esté activo para este producto devuelve 422, nunca se ignora en silencio.
     */
    public function precio(Request $request, Producto $producto, PricingService $pricingService)
    {
        $validated = $request->validate([
            'cantidad' => 'required|integer|min:1',
            'variante_id' => 'nullable|integer',
            'addon_ids' => 'nullable|array',
            'addon_ids.*' => 'integer',
        ]);

        $resultado = $pricingService->calcularPrecio(
            $producto,
            (int) $validated['cantidad'],
            isset($validated['variante_id']) ? (int) $validated['variante_id'] : null,
            $validated['addon_ids'] ?? []
        );

        return response()->json($this->serializarDesglosePrecio($resultado));
    }

    /**
     * Reduce un PriceResult al subconjunto de campos que necesita el front
     * para pintar precio y badge de descuento, sin exponer el objeto Oferta.
     * Usado por show() para `producto.precio_actual` (siempre cantidad=1, sin
     * variante/add-ons) — se mantiene con este shape para no romper ese contrato.
     */
    private function serializarPrecio(PriceResult $resultado): array
    {
        return [
            'precio_lista' => $resultado->precio_lista,
            'precio_unitario_final' => $resultado->precio_unitario_final,
            'ahorro_porcentaje' => $resultado->ahorro_porcentaje,
            'oferta_aplicada' => $resultado->oferta_aplicada !== null,
        ];
    }

    /**
     * Desglose completo del PriceResult para el endpoint GET .../precio: además del
     * precio base y el descuento de oferta, incluye el recargo de variante y el total
     * de add-ons (sumados DESPUÉS del descuento, ver PricingService::calcularPrecio).
     */
    private function serializarDesglosePrecio(PriceResult $resultado): array
    {
        return [
            'precio_base' => $resultado->precio_lista,
            'descuento_aplicado' => $resultado->oferta_aplicada !== null,
            'ahorro' => $resultado->ahorro_unitario,
            'ahorro_porcentaje' => $resultado->ahorro_porcentaje,
            'recargo_variante' => $resultado->recargo_variante,
            'addons_total' => $resultado->addons_total,
            'precio_final_unitario' => $resultado->precio_final_con_opciones,
        ];
    }

    /**
     * Mismo shape reducido que serializarPrecio() pero para un combo (sin variante ni
     * add-ons, ver ComboPriceResult).
     */
    private function serializarPrecioCombo(ComboPriceResult $resultado): array
    {
        return [
            'precio_lista' => $resultado->precio_lista,
            'precio_unitario_final' => $resultado->precio_unitario_final,
            'ahorro_porcentaje' => $resultado->ahorro_porcentaje,
            'oferta_aplicada' => $resultado->descuento_aplicado,
        ];
    }

    /**
     * Listado paginado de combos activos para la pestaña "Combos" de la vidriera.
     * A diferencia del listado de productos, no se filtra por stock (mismo criterio
     * que Producto: se muestran igual, marcados "Sin stock" en el frontend).
     */
    private function indexCombos(Request $request)
    {
        $combos = $this->queryCombos($request)->paginate($this->porPagina($request))->withQueryString();

        $combos->getCollection()->transform(fn (Combo $combo) => $this->serializarComboParaVidriera($combo));

        return Inertia::render('Tienda', [
            'productos' => $combos,
            'categorias' => Categoria::with('subcategorias')->get(),
            'filters' => $this->filtrosActivos($request),
            'disponibles' => $this->filtrosDisponibles(),
            'canLogin' => Route::has('login'),
        ]);
    }

    /**
     * Da a un Combo la misma forma que un Producto en lo que hace falta para que
     * ProductCard/resolverPrecio (pricing.js) y el resto de Tienda.jsx lo rendericen
     * sin cambios: `escalas_precio` vacío (sin escalas por cantidad), `oferta_vigente`
     * con la misma forma tipo_descuento/valor_descuento/alcance que usa un producto
     * (alcance siempre "todos", un combo no tiene escalas). `tiene_variantes` reutiliza
     * el mismo campo/branch que ya usa la card para decidir "Elegir opciones" vs
     * "Agregar" directo, aunque acá signifique "algún item del combo exige elegir color".
     */
    private function serializarComboParaVidriera(Combo $combo): array
    {
        return [
            'id' => $combo->id,
            'tipo' => 'combo',
            'titulo' => $combo->titulo,
            'descripcion' => $combo->descripcion,
            'precio' => (float) $combo->precio,
            'escalas_precio' => [],
            'is_active' => $combo->is_active,
            'is_featured' => $combo->is_featured,
            'stock' => $combo->stockDisponible(),
            'tiene_variantes' => $combo->items->contains(fn (ComboProducto $item) => $item->requiereSeleccionVariante()),
            'imagen_principal' => $combo->imagenPrincipal,
            'categorias' => [],
            'oferta_vigente' => $this->ofertaVigenteComboArray($combo),
            'envio_gratis' => $combo->envio_gratis,
            // Receta mínima para que el "Agregar" rápido de la card arme una línea de carrito
            // completa: sin esto el carrito no sabía qué incluye el combo ni cuántos se pueden
            // comprar (stockDisponibleCombo se deriva de estos items). Mismo shape que showCombo().
            'items' => $combo->items->map(fn (ComboProducto $item) => [
                'id' => $item->id,
                'producto_id' => $item->producto_id,
                'cantidad' => $item->cantidad,
                'producto_variante_id' => $item->producto_variante_id,
                'producto_variante' => $item->productoVariante?->only(['id', 'nombre', 'color_hex', 'stock']),
                'producto' => $item->producto ? [
                    'id' => $item->producto->id,
                    'titulo' => $item->producto->titulo,
                    'is_active' => $item->producto->is_active,
                    'stock' => $item->producto->stock,
                    'variantes_activas' => $item->producto->variantesActivas
                        ->map(fn ($variante) => $variante->only(['id', 'nombre', 'color_hex', 'es_color_personalizado', 'stock']))
                        ->values()
                        ->all(),
                ] : null,
            ])->values()->all(),
        ];
    }

    /**
     * Da al descuento propio del combo (columnas planas, ver Combo::descuentoVigente())
     * la misma forma que `producto.oferta_vigente` espera resolverPrecio() en
     * pricing.js: alcance siempre "todos" porque un combo no tiene escalas de precio.
     */
    private function ofertaVigenteComboArray(Combo $combo): ?array
    {
        if (! $combo->descuentoVigente()) {
            return null;
        }

        return [
            'tipo_descuento' => $combo->tipo_descuento->value,
            'valor_descuento' => (float) $combo->valor_descuento,
            'alcance' => 'todos',
            'producto_escala_precio_id' => null,
        ];
    }
}
