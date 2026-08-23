<?php

namespace App\Http\Controllers;

use App\Services\CodigoDescuentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CodigoDescuentoValidacionController extends Controller
{
    /**
     * Endpoint público (sin auth) que usa el carrito para previsualizar el
     * descuento antes de llegar al checkout. Ver CodigoDescuentoService::validar()
     * para el alcance real de esta validación.
     */
    public function validar(Request $request, CodigoDescuentoService $codigoDescuentoService): JsonResponse
    {
        $validated = $request->validate([
            'codigo' => 'required|string',
            'subtotal' => 'required|numeric|min:0',
        ]);

        return response()->json(
            $codigoDescuentoService->validar($validated['codigo'], (float) $validated['subtotal'])
        );
    }
}
