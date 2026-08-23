<?php

namespace App\Http\Controllers;

use App\Http\Requests\CodigoDescuentoRequest;
use App\Models\CodigoDescuento;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CodigoDescuentoController extends Controller
{
    public function index(): Response
    {
        // total_descontado: suma de descuento_monto de los pedidos que usaron cada
        // código, EXCLUYENDO cancelados (mismo scope Pedido::facturables() que usan
        // los reportes de facturación) — un pedido cancelado liberó su cupo en
        // CodigoDescuentoService::liberarUso() porque el descuento nunca se cobró
        // de verdad, así que no debe contar como plata efectivamente descontada.
        $codigosDescuento = CodigoDescuento::withSum(
            ['pedidos as total_descontado' => fn ($query) => $query->facturables()],
            'descuento_monto'
        )
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/CodigosDescuento/Index', [
            'codigosDescuento' => $codigosDescuento,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/CodigosDescuento/Create');
    }

    public function store(CodigoDescuentoRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        CodigoDescuento::create([
            'codigo' => $validated['codigo'],
            'tipo_descuento' => $validated['tipo_descuento'],
            'valor_descuento' => $validated['valor_descuento'],
            'activo' => $validated['activo'] ?? true,
            'vigente_desde' => $validated['vigente_desde'] ?? null,
            'vigente_hasta' => $validated['vigente_hasta'] ?? null,
            'limite_usos' => $validated['limite_usos'] ?? null,
        ]);

        return redirect()->route('codigos-descuento.index')
            ->with('success', 'Código de descuento creado exitosamente.');
    }

    public function edit(CodigoDescuento $codigos_descuento): Response
    {
        return Inertia::render('Admin/CodigosDescuento/Edit', [
            'codigoDescuento' => $codigos_descuento,
        ]);
    }

    public function update(CodigoDescuentoRequest $request, CodigoDescuento $codigos_descuento): RedirectResponse
    {
        $validated = $request->validated();

        $codigos_descuento->update([
            'codigo' => $validated['codigo'],
            'tipo_descuento' => $validated['tipo_descuento'],
            'valor_descuento' => $validated['valor_descuento'],
            'activo' => $validated['activo'] ?? true,
            'vigente_desde' => $validated['vigente_desde'] ?? null,
            'vigente_hasta' => $validated['vigente_hasta'] ?? null,
            'limite_usos' => $validated['limite_usos'] ?? null,
        ]);

        return redirect()->route('codigos-descuento.index')
            ->with('success', 'Código de descuento actualizado exitosamente.');
    }

    /**
     * El historial de pedidos que ya usaron este código depende de que exista
     * (hasta que en Fase 4 el Pedido guarde su propio snapshot), así que mientras
     * usos_actuales > 0 no se permite el hard-delete.
     */
    public function destroy(CodigoDescuento $codigo_descuento): RedirectResponse
    {
        if ($codigo_descuento->usos_actuales > 0) {
            throw ValidationException::withMessages([
                'codigo' => 'No se puede eliminar un código que ya fue usado en pedidos. Desactivalo en su lugar.',
            ]);
        }

        $codigo_descuento->delete();

        return redirect()->route('codigos-descuento.index')
            ->with('success', 'Código de descuento eliminado exitosamente.');
    }

    public function toggleActive(CodigoDescuento $codigo_descuento): RedirectResponse
    {
        $codigo_descuento->update([
            'activo' => ! $codigo_descuento->activo,
        ]);

        return back();
    }
}
