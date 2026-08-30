<?php

namespace App\Http\Middleware;

use App\Enums\RolUsuario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Uso: ->middleware('role:admin') (acepta varios roles separados por coma).
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $rolesPermitidos = array_map(fn (string $rol) => RolUsuario::from($rol), $roles);

        $usuario = $request->user();

        // Sin mensaje puntual: la pantalla de error (resources/js/Pages/Error.jsx,
        // vía el handler en bootstrap/app.php) ya explica el 403 de forma clara.
        abort_if(! $usuario || ! in_array($usuario->role, $rolesPermitidos, true), 403);

        return $next($request);
    }
}
