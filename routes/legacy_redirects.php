<?php

/**
 * Redirects 301 desde las URLs indexadas del WordPress anterior (chisperio.com.ar)
 * hacia su equivalente en este sitio. El objetivo es transferirle a Google la señal
 * de ranking de esas URLs en vez de perderla mientras reindexa desde cero.
 *
 * Fuente: wp-sitemap.xml del sitio en producción (relevado 2026-08-23).
 *
 * Pendiente a propósito: los redirects de producto individual (/product/{slug}/,
 * 57 URLs) — quedan para cuando el catálogo real esté cargado acá, porque recién
 * ahí se puede mapear cada slug viejo a su producto nuevo.
 *
 * Las categorías/subcategorías se resuelven por NOMBRE contra la base en cada
 * request, no se hardcodean ids: en producción se administran a mano desde el
 * panel (Admin/Categorias, Admin/Subcategorias), así que sus ids no tienen por qué
 * coincidir con los del seeder de desarrollo.
 */

use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Support\Facades\Route;

// ── Páginas fijas ────────────────────────────────────────────────────────────
Route::permanentRedirect('/home/products', '/tienda');
// OJO: NO se puede registrar un redirect en '/productos' — colisiona con la carpeta
// real public/productos/ (imágenes y videos subidos, ver PRODUCTOS_IMG_PATH). Tanto
// el server de PHP en local como el .htaccess estándar de Apache en producción
// excluyen explícitamente las rutas que coinciden con un directorio físico, así que
// la request nunca llega a Laravel. Se pierde esta única URL vieja (/tienda sigue
// cubierta por /home/products y el resto de los redirects de categoría).
Route::permanentRedirect('/home/cart', '/carrito');
Route::permanentRedirect('/resumen-de-compra', '/carrito');
Route::permanentRedirect('/home/checkout', '/checkout');
Route::permanentRedirect('/home/checkout/resumen-pedido', '/confirmacion-pedido');
Route::permanentRedirect('/compra-mayorista', '/mayoristas');
Route::permanentRedirect('/quienessomos', '/#sobre-nosotros');
Route::permanentRedirect('/servicios', '/#alquiler');
Route::permanentRedirect('/ayuda', '/#preguntas-frecuentes');
Route::permanentRedirect('/resenas', '/#resenas');
Route::permanentRedirect('/cotillon', '/tienda');

Route::get('/servicios/chispasfrias', function () {
    $categoria = Categoria::where('nombre', 'Chispas frias')->first();

    return redirect($categoria ? '/tienda?categoria='.$categoria->id : '/tienda', 301);
});

// ── Categorías / subcategorías de producto ────────────────────────────────────
// slug viejo (sin /product-category/) => [nombre categoría, nombre subcategoría|null]
$categoriasLegacy = [
    'fuegos-artificiales' => ['Fuegos Artificiales', null],
    'chispas-frias' => ['Chispas frias', null],
    'chispas-frias/2x20' => ['Chispas frias', '2x20'],
    'chispas-frias/3x30' => ['Chispas frias', '3x30'],
    'chispas-frias/4x30' => ['Chispas frias', '4x30'],
    'chispas-frias/5x1' => ['Chispas frias', '5x1'],
    'humo' => ['Humo', null],
    'humo/pote' => ['Humo', 'Pote'],
    'humo/bengala' => ['Humo', 'Bengala'],
    'humo/torta' => ['Humo', 'Torta'],
    'producto/maquinaria' => ['Maquinaria', null],
    'producto/maquinaria/lanzallama' => ['Maquinaria', 'Lanzallama'],
    'producto/maquinaria/detonador-inalambrico' => ['Maquinaria', 'Detonador Inalambrico'],
    'producto/maquinaria/baston-mano' => ['Maquinaria', 'Baston de Mano'],
    'producto/maquinaria/pistola' => ['Maquinaria', 'Pistola'],
    'pirotecnia' => ['Pirotecnia', null],
    'velas' => ['Velas', null],
    'velas/sparkle' => ['Velas', 'Sparkie'],
    'velas/bengalas' => ['Velas', 'Bengalas'],
];

Route::get('/product-category/{slug}', function (string $slug) use ($categoriasLegacy) {
    $slug = rtrim($slug, '/');

    if ($slug === 'producto') {
        return redirect('/tienda', 301);
    }

    if ($slug === 'destacados') {
        return redirect('/tienda?filter=destacados', 301);
    }

    if (! isset($categoriasLegacy[$slug])) {
        abort(404);
    }

    [$nombreCategoria, $nombreSubcategoria] = $categoriasLegacy[$slug];

    $categoria = Categoria::where('nombre', $nombreCategoria)->first();

    if (! $categoria) {
        return redirect('/tienda', 301);
    }

    $params = ['categoria' => $categoria->id];

    if ($nombreSubcategoria) {
        $subcategoria = Subcategoria::where('categoria_id', $categoria->id)
            ->where('nombre', $nombreSubcategoria)
            ->first();

        if ($subcategoria) {
            $params['subcategoria'] = $subcategoria->id;
        }
    }

    return redirect('/tienda?'.http_build_query($params), 301);
})->where('slug', '.*');
