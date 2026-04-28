<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

class TiendaController extends Controller
{
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
