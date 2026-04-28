<?php

use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\OfertaController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SubcategoriaController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $productosDestacados = \App\Models\Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias'])
        ->where('is_active', true)
        ->where('is_featured', true)
        ->get();

    $categorias = \App\Models\Categoria::all();

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'productosDestacados' => $productosDestacados,
        'categorias' => $categorias,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Rutas de Categorías
    Route::resource('admin/categorias', CategoriaController::class)->names([
        'index' => 'categorias.index',
        'create' => 'categorias.create',
        'store' => 'categorias.store',
        'show' => 'categorias.show',
        'edit' => 'categorias.edit',
        'update' => 'categorias.update',
        'destroy' => 'categorias.destroy',
    ]);
    
    // Rutas de Subcategorías
    Route::resource('admin/subcategorias', SubcategoriaController::class)->names([
        'index' => 'subcategorias.index',
        'create' => 'subcategorias.create',
        'store' => 'subcategorias.store',
        'show' => 'subcategorias.show',
        'edit' => 'subcategorias.edit',
        'update' => 'subcategorias.update',
        'destroy' => 'subcategorias.destroy',
    ]);
    
    // Rutas de Productos
    Route::resource('admin/productos', ProductoController::class)->names([
        'index' => 'productos.index',
        'create' => 'productos.create',
        'store' => 'productos.store',
        'show' => 'productos.show',
        'edit' => 'productos.edit',
        'update' => 'productos.update',
        'destroy' => 'productos.destroy',
    ]);
    Route::patch('admin/productos/{producto}/toggle-featured', [ProductoController::class, 'toggleFeatured'])->name('productos.toggle-featured');

    // Rutas de Ofertas
    Route::resource('admin/ofertas', OfertaController::class)->names([
        'index' => 'ofertas.index',
        'create' => 'ofertas.create',
        'store' => 'ofertas.store',
        'show' => 'ofertas.show',
        'edit' => 'ofertas.edit',
        'update' => 'ofertas.update',
        'destroy' => 'ofertas.destroy',
    ]);
    Route::patch('admin/ofertas/{oferta}/toggle-active', [OfertaController::class, 'toggleActive'])->name('ofertas.toggle-active');
});

require __DIR__.'/auth.php';
