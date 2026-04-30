<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

class TiendaController extends Controller
{
    public function show(Producto $producto)
    {
        abort_if(!$producto->is_active, 404);

        $producto->load([
            'imagenes',
            'imagenPrincipal',
            'ofertaVigente',
            'categorias',
            'subcategorias',
        ]);

        $categoriaIds = $producto->categorias->pluck('id');

        $relacionados = Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias'])
            ->where('is_active', true)
            ->where('id', '!=', $producto->id)
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
        $query = Producto::with([
            'imagenPrincipal',
            'ofertaVigente',
            'categorias',
            'subcategorias',
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

        $productos = $query->latest()->paginate(12)->withQueryString();

        return Inertia::render('Tienda', [
            'productos'  => $productos,
            'categorias' => Categoria::with('subcategorias')->get(),
            'filters'    => $request->only(['categoria', 'subcategoria', 'filter']),
            'canLogin'   => Route::has('login'),
        ]);
    }
}
