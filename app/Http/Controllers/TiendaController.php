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
            'imagenPrincipal',
            'ofertaVigente',
            'categorias',
            'subcategorias',
            'escalasPrecio',
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
        ])->where('is_active', true);

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

        return Inertia::render('Tienda', [
            'productos'  => $productos,
            'categorias' => Categoria::with('subcategorias')->get(),
            'filters'    => $request->only(['categoria', 'subcategoria', 'filter', 'q']),
            'canLogin'   => Route::has('login'),
        ]);
    }

    /**
     * Recalcula el precio de un producto para una cantidad dada. Pensado para
     * que el front (ficha de producto, carrito) lo consulte al cambiar cantidad
     * sin duplicar la lógica de PricingService en JS.
     */
    public function precio(Request $request, Producto $producto, PricingService $pricingService)
    {
        $validated = $request->validate([
            'cantidad' => 'required|integer|min:1',
        ]);

        $resultado = $pricingService->calcularPrecio($producto, (int) $validated['cantidad']);

        return response()->json($this->serializarPrecio($resultado));
    }

    /**
     * Reduce un PriceResult al subconjunto de campos que necesita el front
     * para pintar precio y badge de descuento, sin exponer el objeto Oferta.
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
}
