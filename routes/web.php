<?php

use App\Http\Controllers\AddonController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\CodigoDescuentoController;
use App\Http\Controllers\ConfiguracionEnvioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MetricasController;
use App\Http\Controllers\OfertaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PrecioController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SubcategoriaController;
use App\Http\Controllers\TiendaController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Redirects 301 de las URLs indexadas del WordPress anterior — ver el archivo para
// el detalle. Van primero para que no puedan quedar sombreados por otra ruta.
require __DIR__.'/legacy_redirects.php';

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
    // withCount igual que TiendaController::index: OutstandingProducts.jsx tiene el
    // mismo botón de "Agregar" rápido que Tienda.jsx, así que necesita el mismo dato
    // para mandar al cliente a la ficha en vez de agregar sin color un producto que
    // tiene variantes activas.
    $productosDestacados = \App\Models\Producto::with(['imagenPrincipal', 'ofertaVigente', 'categorias', 'escalasPrecio'])
        ->withCount('variantesActivas')
        ->where('is_active', true)
        ->where('is_featured', true)
        ->conStock()
        ->latest('updated_at')
        ->latest('id')
        ->get()
        ->each(fn ($producto) => $producto->setAttribute('tiene_variantes', $producto->variantes_activas_count > 0));

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

    // Vista de solo lectura de precios/catálogo — vendedor y admin (el vendedor no
    // tiene acceso a los CRUDs reales de productos/categorías/ofertas/etc., ver más abajo).
    Route::get('admin/precios', [PrecioController::class, 'index'])->name('precios.index');

    // Rutas de Pedidos (sin cambios)
    Route::get('admin/pedidos', [PedidoController::class, 'index'])->name('pedidos.index');
    Route::get('admin/pedidos/{pedido}', [PedidoController::class, 'show'])->name('pedidos.show');
    Route::patch('admin/pedidos/{pedido}/estado', [PedidoController::class, 'cambiarEstado'])->name('pedidos.cambiar-estado');

    // Gestión de catálogo (categorías/subcategorías/productos/ofertas/códigos de
    // descuento/add-ons) — reservada a admin; el vendedor solo consulta desde
    // admin/precios de arriba, sin poder crear/editar/eliminar nada de esto.
    Route::middleware('role:admin')->group(function () {
        Route::resource('admin/categorias', CategoriaController::class)->names([
            'index' => 'categorias.index',
            'create' => 'categorias.create',
            'store' => 'categorias.store',
            'show' => 'categorias.show',
            'edit' => 'categorias.edit',
            'update' => 'categorias.update',
            'destroy' => 'categorias.destroy',
        ]);

        Route::resource('admin/subcategorias', SubcategoriaController::class)->names([
            'index' => 'subcategorias.index',
            'create' => 'subcategorias.create',
            'store' => 'subcategorias.store',
            'show' => 'subcategorias.show',
            'edit' => 'subcategorias.edit',
            'update' => 'subcategorias.update',
            'destroy' => 'subcategorias.destroy',
        ]);

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

        Route::resource('admin/codigos-descuento', CodigoDescuentoController::class)->names([
            'index' => 'codigos-descuento.index',
            'create' => 'codigos-descuento.create',
            'store' => 'codigos-descuento.store',
            'show' => 'codigos-descuento.show',
            'edit' => 'codigos-descuento.edit',
            'update' => 'codigos-descuento.update',
            'destroy' => 'codigos-descuento.destroy',
        ]);
        Route::patch('admin/codigos-descuento/{codigo_descuento}/toggle-active', [CodigoDescuentoController::class, 'toggleActive'])->name('codigos-descuento.toggle-active');

        // Add-ons — catálogo global de personalizaciones con costo.
        Route::resource('admin/addons', AddonController::class)->names([
            'index' => 'addons.index',
            'create' => 'addons.create',
            'store' => 'addons.store',
            'show' => 'addons.show',
            'edit' => 'addons.edit',
            'update' => 'addons.update',
            'destroy' => 'addons.destroy',
        ]);
        Route::patch('admin/addons/{addon}/toggle-active', [AddonController::class, 'toggleActive'])->name('addons.toggle-active');
    });

    // Ruta de Métricas — datos de facturación, solo admin.
    Route::get('admin/metricas', [MetricasController::class, 'index'])
        ->middleware('role:admin')
        ->name('metricas.index');

    // Rutas de Usuarios (alta y gestión de roles) — solo admin.
    Route::resource('admin/usuarios', UsuarioController::class)->except('show')->middleware('role:admin')->names([
        'index' => 'usuarios.index',
        'create' => 'usuarios.create',
        'store' => 'usuarios.store',
        'edit' => 'usuarios.edit',
        'update' => 'usuarios.update',
        'destroy' => 'usuarios.destroy',
    ]);

    // Configuración de envío gratis — solo admin.
    Route::get('admin/configuracion/envio', [ConfiguracionEnvioController::class, 'edit'])
        ->middleware('role:admin')
        ->name('configuracion-envio.edit');
    Route::patch('admin/configuracion/envio', [ConfiguracionEnvioController::class, 'update'])
        ->middleware('role:admin')
        ->name('configuracion-envio.update');
});

require __DIR__.'/auth.php';
