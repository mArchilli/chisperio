<?php

namespace App\Http\Controllers;

use App\Models\ConfiguracionEnvio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConfiguracionEnvioController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/ConfiguracionEnvio/Edit', [
            'configuracion' => ConfiguracionEnvio::obtener()->only('monto_minimo'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'monto_minimo' => 'required|numeric|min:0',
        ], [
            'monto_minimo.required' => 'Ingresá un monto.',
            'monto_minimo.numeric' => 'El monto debe ser un número.',
            'monto_minimo.min' => 'El monto no puede ser negativo.',
        ]);

        ConfiguracionEnvio::obtener()->update(['monto_minimo' => $validated['monto_minimo']]);

        return redirect()->route('configuracion-envio.edit')->with('success', 'Configuración actualizada.');
    }
}
