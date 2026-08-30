<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequerirCambioDePassword
{
    /**
     * Un vendedor recién creado por el admin arranca con
     * `debe_cambiar_password = true` (la clave que le asignaron es temporal).
     * Hasta que configure su propia clave en `password.configurar` no puede
     * navegar a ningún otro lado — cualquier request se redirige ahí. Lo único
     * que sigue disponible es la propia pantalla de configuración y cerrar
     * sesión. Ver App\Http\Controllers\Auth\ConfigurarPasswordController.
     *
     * Se aplica global al grupo `web` (bootstrap/app.php) para que ninguna ruta
     * autenticada nueva quede sin cubrir; para requests sin sesión o de usuarios
     * sin la marca es un no-op.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        $rutasPermitidas = ['password.configurar', 'password.configurar.update', 'logout'];

        if ($usuario && $usuario->debe_cambiar_password && ! $request->routeIs($rutasPermitidas)) {
            return redirect()->route('password.configurar');
        }

        return $next($request);
    }
}
