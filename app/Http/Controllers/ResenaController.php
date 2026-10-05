<?php

namespace App\Http\Controllers;

use App\Models\Resena;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Gestión de las reseñas que se muestran en la landing. Admin y vendedor pueden ver,
 * crear, editar y ocultar/mostrar; eliminar es solo del admin (la ruta de destroy vive en
 * el grupo role:admin de routes/web.php, no se resuelve acá con un chequeo en el cuerpo).
 */
class ResenaController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Resenas/Index', [
            'resenas' => Resena::recientesPrimero()->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Resenas/Create', [
            'colores' => Resena::COLORES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validarDatos($request);

        Resena::create([
            ...$validated,
            'color_avatar' => $validated['color_avatar'] ?? Resena::colorPorDefecto($validated['nombre']),
        ]);

        return redirect()->route('resenas.index')->with('success', 'Reseña creada exitosamente.');
    }

    public function edit(Resena $resena): Response
    {
        return Inertia::render('Admin/Resenas/Edit', [
            'resena' => $resena,
            'colores' => Resena::COLORES,
        ]);
    }

    public function update(Request $request, Resena $resena): RedirectResponse
    {
        $validated = $this->validarDatos($request);

        $resena->update([
            ...$validated,
            'color_avatar' => $validated['color_avatar'] ?? $resena->color_avatar ?? Resena::colorPorDefecto($validated['nombre']),
        ]);

        return redirect()->route('resenas.index')->with('success', 'Reseña actualizada exitosamente.');
    }

    public function destroy(Resena $resena): RedirectResponse
    {
        $resena->delete();

        return redirect()->route('resenas.index')->with('success', 'Reseña eliminada exitosamente.');
    }

    /** Mostrar/ocultar en la landing sin entrar a editar. */
    public function toggleActive(Resena $resena): RedirectResponse
    {
        $resena->update(['is_active' => ! $resena->is_active]);

        return back();
    }

    private function validarDatos(Request $request): array
    {
        return $request->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'meta' => ['nullable', 'string', 'max:150'],
            'texto' => ['nullable', 'string', 'max:2000'],
            'puntuacion' => ['required', 'integer', 'between:1,5'],
            // No tiene sentido una reseña con fecha futura: aparecería como "Hoy" y rompería el orden.
            'fecha' => ['required', 'date', 'before_or_equal:today'],
            'color_avatar' => ['nullable', 'string', Rule::in(Resena::COLORES)],
            'is_active' => ['boolean'],
        ], [
            'nombre.required' => 'Ingresá el nombre de quien dejó la reseña.',
            'puntuacion.between' => 'La puntuación va de 1 a 5 estrellas.',
            'fecha.required' => 'Indicá la fecha de la reseña.',
            'fecha.before_or_equal' => 'La fecha no puede ser futura.',
            'color_avatar.in' => 'Elegí uno de los colores disponibles.',
        ]);
    }
}
