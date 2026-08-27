<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlanPagoTarjetaRequest;
use App\Models\PlanPagoTarjeta;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PlanPagoTarjetaController extends Controller
{
    public function index(): Response
    {
        $planes = PlanPagoTarjeta::withCount('pedidos')
            ->orderBy('orden')
            ->get();

        $planes->each(fn (PlanPagoTarjeta $plan) => $plan->usado = $plan->pedidos_count > 0);

        return Inertia::render('Admin/PlanesPago/Index', [
            'planes' => $planes,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/PlanesPago/Create');
    }

    public function store(PlanPagoTarjetaRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        PlanPagoTarjeta::create([
            'nombre' => $validated['nombre'],
            'cuotas' => $validated['cuotas'],
            'recargo_porcentaje' => $validated['recargo_porcentaje'],
            'orden' => $validated['orden'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('planes-pago.index')
            ->with('success', 'Plan de pago creado exitosamente.');
    }

    public function edit(PlanPagoTarjeta $planes_pago): Response
    {
        return Inertia::render('Admin/PlanesPago/Edit', [
            'plan' => [
                ...$planes_pago->toArray(),
                'usado' => $this->estaUsado($planes_pago),
            ],
        ]);
    }

    public function update(PlanPagoTarjetaRequest $request, PlanPagoTarjeta $planes_pago): RedirectResponse
    {
        $validated = $request->validated();

        $planes_pago->update([
            'nombre' => $validated['nombre'],
            'cuotas' => $validated['cuotas'],
            'recargo_porcentaje' => $validated['recargo_porcentaje'],
            'orden' => $validated['orden'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('planes-pago.index')
            ->with('success', 'Plan de pago actualizado exitosamente.');
    }

    /**
     * Pedidos históricos ya tienen este plan snapshoteado (plan_pago_nombre,
     * recargo_porcentaje, etc.), así que borrarlo rompería ese registro. Mismo
     * criterio que AddonController::destroy y CodigoDescuentoController::destroy:
     * si ya fue usado, solo se puede desactivar.
     */
    public function destroy(PlanPagoTarjeta $planes_pago): RedirectResponse
    {
        if ($this->estaUsado($planes_pago)) {
            throw ValidationException::withMessages([
                'nombre' => 'No se puede eliminar un plan que ya fue usado en pedidos. Desactivalo en su lugar.',
            ]);
        }

        $planes_pago->delete();

        return redirect()->route('planes-pago.index')
            ->with('success', 'Plan de pago eliminado exitosamente.');
    }

    public function toggleActive(PlanPagoTarjeta $planes_pago): RedirectResponse
    {
        $planes_pago->update([
            'is_active' => ! $planes_pago->is_active,
        ]);

        return back();
    }

    private function estaUsado(PlanPagoTarjeta $plan): bool
    {
        return $plan->pedidos()->exists();
    }
}
