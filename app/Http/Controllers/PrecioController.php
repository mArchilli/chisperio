<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Producto;
use Inertia\Inertia;

class PrecioController extends Controller
{
    /**
     * Vista de solo lectura del catálogo completo (precios, escalas por cantidad,
     * variantes de color y add-ons) pensada para vendedores: no exponen aquí ningún
     * CRUD, esos siguen reservados a role:admin (ver routes/web.php).
     */
    public function index()
    {
        $productos = Producto::with([
            'categorias',
            'subcategorias',
            'imagenPrincipal',
            'ofertaVigente',
            'escalasPrecio',
            'variantesActivas',
            'addonsActivos',
        ])->orderBy('titulo')->get();

        $categorias = Categoria::with('subcategorias')->orderBy('nombre')->get();

        return Inertia::render('Admin/Precios/Index', [
            'productos' => $productos,
            'categorias' => $categorias,
        ]);
    }
}
