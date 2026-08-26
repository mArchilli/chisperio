<?php

namespace App\Http\Controllers;

use App\Http\Requests\AddonRequest;
use App\Models\Addon;
use App\Models\PedidoItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AddonController extends Controller
{
    public function index(): Response
    {
        // 'usado' se resuelve con un EXISTS correlacionado contra el JSON de
        // pedido_items.addons_seleccionados (no hay FK real: el addon queda
        // snapshoteado ahí, ver create_producto_addon_table). Se calcula acá en
        // una sola query en vez de N+1 para poder mostrar/deshabilitar el botón
        // de eliminar en la tabla, igual que CodigoDescuentoController con
        // usos_actuales.
        $addons = Addon::query()
            ->selectRaw('addons.*, EXISTS (
                select 1 from pedido_items
                where json_contains(pedido_items.addons_seleccionados, json_object("addon_id", addons.id))
            ) as usado')
            ->orderBy('created_at', 'desc')
            ->get();

        $addons->each(fn (Addon $addon) => $addon->usado = (bool) $addon->usado);

        return Inertia::render('Admin/Addons/Index', [
            'addons' => $addons,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Addons/Create');
    }

    public function store(AddonRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        Addon::create([
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'precio' => $validated['precio'],
            'requiere_texto' => $validated['requiere_texto'] ?? false,
            'placeholder_texto' => $validated['placeholder_texto'] ?? null,
            'max_caracteres' => $validated['max_caracteres'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('addons.index')
            ->with('success', 'Add-on creado exitosamente.');
    }

    public function edit(Addon $addon): Response
    {
        return Inertia::render('Admin/Addons/Edit', [
            'addon' => [
                ...$addon->toArray(),
                'usado' => $this->estaUsado($addon),
            ],
        ]);
    }

    public function update(AddonRequest $request, Addon $addon): RedirectResponse
    {
        $validated = $request->validated();

        $addon->update([
            'nombre' => $validated['nombre'],
            'descripcion' => $validated['descripcion'] ?? null,
            'precio' => $validated['precio'],
            'requiere_texto' => $validated['requiere_texto'] ?? false,
            'placeholder_texto' => $validated['placeholder_texto'] ?? null,
            'max_caracteres' => $validated['max_caracteres'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('addons.index')
            ->with('success', 'Add-on actualizado exitosamente.');
    }

    /**
     * Pedidos históricos ya tienen el precio de este addon snapshoteado en
     * pedido_items.addons_seleccionados, así que borrarlo rompería ese registro.
     * Mismo criterio que CodigoDescuentoController::destroy: si ya fue usado,
     * solo se puede desactivar.
     */
    public function destroy(Addon $addon): RedirectResponse
    {
        if ($this->estaUsado($addon)) {
            throw ValidationException::withMessages([
                'nombre' => 'No se puede eliminar un add-on que ya fue usado en pedidos. Desactivalo en su lugar.',
            ]);
        }

        $addon->delete();

        return redirect()->route('addons.index')
            ->with('success', 'Add-on eliminado exitosamente.');
    }

    public function toggleActive(Addon $addon): RedirectResponse
    {
        $addon->update([
            'is_active' => ! $addon->is_active,
        ]);

        return back();
    }

    private function estaUsado(Addon $addon): bool
    {
        return PedidoItem::query()
            ->whereJsonContains('addons_seleccionados', ['addon_id' => $addon->id])
            ->exists();
    }
}
