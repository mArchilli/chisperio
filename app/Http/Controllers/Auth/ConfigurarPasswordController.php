<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Primer ingreso de un vendedor: reemplaza la clave temporal que le asignó el
 * admin por una propia. Mientras `users.debe_cambiar_password` esté en `true`,
 * App\Http\Middleware\RequerirCambioDePassword redirige cualquier otra ruta acá.
 */
class ConfigurarPasswordController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->debe_cambiar_password) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Auth/ConfigurarPassword');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
        ], [
            'password.required' => 'Ingresá tu nueva clave.',
            'password.confirmed' => 'La confirmación de la clave no coincide.',
        ]);

        $usuario = $request->user();

        if (Hash::check($validated['password'], $usuario->password)) {
            throw ValidationException::withMessages([
                'password' => 'La nueva clave tiene que ser distinta de la que te asignaron.',
            ]);
        }

        $usuario->update([
            'password' => Hash::make($validated['password']),
            'debe_cambiar_password' => false,
        ]);

        return redirect()->route('dashboard')->with('success', 'Tu clave de vendedor quedó configurada.');
    }
}
