<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            // Fuerza a un vendedor recién creado a configurar su propia clave en
            // el primer ingreso antes de poder usar cualquier otra ruta.
            \App\Http\Middleware\RequerirCambioDePassword::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Errores de navegación esperables: en vez del error crudo de
        // Laravel/Symfony —que además Inertia muestra como un modal con el HTML
        // embebido— se renderiza una página Inertia propia.
        //   404 -> `NotFound.jsx` (diseño del sitio público, ver Welcome.jsx).
        //   403/419/5xx -> `Error.jsx` (caso típico: un vendedor que clickea una
        //   card/acceso del panel que es solo `role:admin`).
        $exceptions->respond(function (Response $response, \Throwable $exception, Request $request) {
            if ($request->expectsJson()) {
                return $response;
            }

            $status = $response->getStatusCode();

            // 403/404 siempre (también en local, para poder verlo en desarrollo).
            // 5xx solo fuera de local, para no tapar el detalle de debugging.
            $interceptar = in_array($status, [403, 404], true)
                || (in_array($status, [500, 503], true) && ! app()->environment('local'));

            if (! $interceptar) {
                return $response;
            }

            $pagina = $status === 404
                ? Inertia::render('NotFound')
                : Inertia::render('Error', [
                    'status' => $status,
                    // El mensaje puntual solo se muestra en el 403 (ahí viene de un
                    // `abort(403, '...')` nuestro y es legible); en el resto sería
                    // ruido o podría filtrar internals.
                    'message' => $status === 403 ? ($exception->getMessage() ?: null) : null,
                ]);

            return $pagina->toResponse($request)->setStatusCode($status);
        });
    })->create();

$publicHtml = dirname(dirname(__DIR__)).'/public_html';
if (is_dir($publicHtml)) {
    $app->usePublicPath($publicHtml);
}

return $app;
