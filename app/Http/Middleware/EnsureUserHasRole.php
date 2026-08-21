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

        abort_if(
            ! $usuario || ! in_array($usuario->role, $rolesPermitidos, true),
            403,
            'No tenés permiso para acceder a esta sección.'
        );

        return $next($request);
    }
}
