<?php

namespace App\Http\Controllers;

use App\DataTransferObjects\PriceResult;
use App\Models\Categoria;
use App\Models\EscalaPrecio;
use App\Models\Producto;
use App\Services\PricingService;
use Illuminate\Http\Request;
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

        $relacionados = Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias'])
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
            $relacionados = Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias'])
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
            'canLogin'    => Route::has('login'),
        ]);
    }

    public function index(Request $request)
    {
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
        ])
            // No se cargan las variantes completas acá (esto es un listado, no la ficha):
            // solo hace falta saber si existe al menos una activa, para que el "Agregar"
            // rápido de la card (Tienda.jsx) sepa que tiene que mandar al cliente a elegir
            // color en la ficha en vez de agregar directo sin variante — ver
            // PedidoController::store, que rechaza justamente ese caso.
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
            $query->whereHas('ofertas', function ($q) {
                $q->where('is_active', true)
                    ->where(function ($q2) {
                        $q2->whereNull('fecha_inicio')->orWhere('fecha_inicio', '<=', now());
                    })
                    ->where(function ($q2) {
                        $q2->whereNull('fecha_fin')->orWhere('fecha_fin', '>=', now());
                    });
            });
        }

        // Productos sin stock al final del listado (stock NULL = ilimitado siempre
        // cuenta como "con stock" acá, igual que Producto::scopeConStock).
        $productos = $query
            ->orderByRaw('CASE WHEN stock = 0 THEN 1 ELSE 0 END')
            ->latest()
            ->paginate(12)
            ->withQueryString();

        $productos->getCollection()->each(
            fn (Producto $producto) => $producto->setAttribute('tiene_variantes', $producto->variantes_activas_count > 0)
        );

        return Inertia::render('Tienda', [
            'productos'  => $productos,
            'categorias' => Categoria::with('subcategorias')->get(),
            'filters'    => $request->only(['categoria', 'subcategoria', 'filter', 'q']),
            'canLogin'   => Route::has('login'),
        ]);
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
}
