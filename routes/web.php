<?php

use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MetricasController;
use App\Http\Controllers\OfertaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SubcategoriaController;
use App\Http\Controllers\TiendaController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/tienda', [TiendaController::class, 'index'])->name('tienda.index');
Route::get('/tienda/{producto}', [TiendaController::class, 'show'])->name('tienda.show');

Route::get('/contacto', function () {
    return Inertia::render('Contacto', [
        'canLogin' => Route::has('login'),
    ]);
})->name('contacto.index');

Route::get('/mayoristas', function () {
    return Inertia::render('Mayoristas', [
        'canLogin' => Route::has('login'),
    ]);
})->name('mayoristas.index');

Route::get('/carrito', function () {
    return Inertia::render('Carrito', [
        'canLogin' => Route::has('login'),
    ]);
})->name('carrito.index');

Route::get('/checkout', function () {
    return Inertia::render('Checkout', [
        'canLogin' => Route::has('login'),
    ]);
})->name('checkout.index');

Route::post('/checkout', [PedidoController::class, 'store'])->name('checkout.store');

Route::get('/confirmacion-pedido', function () {
    return Inertia::render('ConfirmacionPedido', [
        'canLogin' => Route::has('login'),
    ]);
})->name('confirmacion.index');

Route::get('/', function () {
    $productosDestacados = \App\Models\Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias', 'escalasPrecio'])
        ->where('is_active', true)
        ->where('is_featured', true)
        ->latest('updated_at')
        ->latest('id')
        ->get();

    $categorias = \App\Models\Categoria::all();

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'productosDestacados' => $productosDestacados,
        'categorias' => $categorias,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

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

    // Rutas de Pedidos
    Route::get('admin/pedidos', [PedidoController::class, 'index'])->name('pedidos.index');
    Route::get('admin/pedidos/{pedido}', [PedidoController::class, 'show'])->name('pedidos.show');
    Route::patch('admin/pedidos/{pedido}/estado', [PedidoController::class, 'cambiarEstado'])->name('pedidos.cambiar-estado');

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

    // Ruta de Métricas
    Route::get('admin/metricas', [MetricasController::class, 'index'])->name('metricas.index');
});

require __DIR__.'/auth.php';
