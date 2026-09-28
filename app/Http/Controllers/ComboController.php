<?php

namespace App\Http\Controllers;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ComboController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $combos = Combo::with(['imagenPrincipal', 'items.producto', 'items.productoVariante'])->get();

        return Inertia::render('Admin/Combos/Index', [
            'combos' => $combos,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Admin/Combos/Create', [
            'productosDisponibles' => $this->productosDisponibles(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate(array_merge([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'envio_gratis' => 'boolean',
            'imagenes.*' => 'nullable|image|max:5120',
            'videos.*' => 'nullable|mimes:mp4,mov,avi,wmv|max:51200',
            'imagen_principal' => 'nullable|integer',
        ], $this->itemsReglas(), $this->descuentoReglas()), array_merge(
            $this->itemsMensajes(),
            $this->descuentoMensajes()
        ));

        $combo = DB::transaction(function () use ($validated) {
            $combo = Combo::create([
                'titulo' => $validated['titulo'],
                'descripcion' => $validated['descripcion'] ?? null,
                'precio' => $validated['precio'],
                'is_active' => $validated['is_active'] ?? true,
                'is_featured' => $validated['is_featured'] ?? false,
                'envio_gratis' => $validated['envio_gratis'] ?? false,
                ...$this->datosDescuento($validated),
            ]);

            $this->sincronizarItems($combo, $validated['items']);

            return $combo;
        });

        $this->guardarMedia($request, $combo);

        return redirect()->route('combos.index')
            ->with('success', 'Combo creado exitosamente');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Combo $combo)
    {
        $combo->load(['media', 'items']);

        return Inertia::render('Admin/Combos/Edit', [
            'combo' => $combo,
            'productosDisponibles' => $this->productosDisponibles(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Combo $combo)
    {
        $validated = $request->validate(array_merge([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'envio_gratis' => 'boolean',
            'imagenes.*' => 'nullable|image|max:5120',
            'videos.*' => 'nullable|mimes:mp4,mov,avi,wmv|max:51200',
            'media_eliminar' => 'array',
        ], $this->itemsReglas($combo), $this->descuentoReglas()), array_merge(
            $this->itemsMensajes(),
            $this->descuentoMensajes()
        ));

        DB::transaction(function () use ($validated, $combo) {
            $combo->update([
                'titulo' => $validated['titulo'],
                'descripcion' => $validated['descripcion'] ?? null,
                'precio' => $validated['precio'],
                'is_active' => $validated['is_active'] ?? true,
                'is_featured' => $validated['is_featured'] ?? false,
                'envio_gratis' => $validated['envio_gratis'] ?? false,
                ...$this->datosDescuento($validated),
            ]);

            $this->sincronizarItems($combo, $validated['items']);
        });

        if (isset($validated['media_eliminar']) && is_array($validated['media_eliminar'])) {
            foreach ($validated['media_eliminar'] as $mediaId) {
                $media = $combo->media()->find($mediaId);
                if ($media) {
                    $filePath = public_path($media->ruta);
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                    $media->delete();
                }
            }
        }

        $this->guardarMedia($request, $combo);

        return redirect()->route('combos.index')
            ->with('success', 'Combo actualizado exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Combo $combo)
    {
        $combo->delete();

        return redirect()->route('combos.index')
            ->with('success', 'Combo eliminado exitosamente');
    }

    /**
     * Toggle featured status
     */
    public function toggleFeatured(Combo $combo)
    {
        $combo->update([
            'is_featured' => ! $combo->is_featured,
        ]);

        return redirect()->back();
    }

    /**
     * Catálogo de productos activos (con sus variantes activas) que puede usar el
     * repeater de items del combo (ComboProductosRepeater.jsx) para poblar el select
     * de producto y, dependiente de ese, el select de variante fija opcional.
     */
    private function productosDisponibles()
    {
        return Producto::where('is_active', true)
            ->with(['variantesActivas', 'imagenPrincipal'])
            ->orderBy('titulo')
            ->get(['id', 'titulo', 'precio', 'stock']);
    }

    /**
     * Reglas de validación para el array items (la receta del combo). En edición
     * ($combo presente), valida además que cualquier id enviado pertenezca al combo
     * que se está editando y que la variante, si viene, pertenezca al producto de esa
     * misma fila.
     */
    private function itemsReglas(?Combo $combo = null): array
    {
        $reglas = [
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'integer', Rule::exists('productos', 'id')],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.producto_variante_id' => ['nullable', 'integer'],
        ];

        if ($combo !== null) {
            $reglas['items.*.id'] = [
                'nullable',
                'integer',
                Rule::exists('combo_productos', 'id')->where(
                    fn ($query) => $query->where('combo_id', $combo->id)
                ),
            ];
        }

        return $reglas;
    }

    private function itemsMensajes(): array
    {
        return [
            'items.required' => 'El combo necesita al menos un producto.',
            'items.min' => 'El combo necesita al menos un producto.',
            'items.*.producto_id.required' => 'Elegí un producto para esta línea.',
            'items.*.producto_id.exists' => 'El producto elegido no existe.',
            'items.*.cantidad.required' => 'La cantidad es obligatoria.',
            'items.*.cantidad.min' => 'La cantidad debe ser al menos 1.',
            'items.*.id.exists' => 'El item indicado no pertenece a este combo.',
        ];
    }

    /**
     * Sincroniza combo_productos contra el payload recibido: borra las filas que ya
     * no vengan (por id) y hace upsert del resto — mismo patrón que
     * ProductoController::sincronizarVariantes. `orden` se asigna según la posición
     * dentro del array recibido. Valida acá (no en las reglas de arriba, porque
     * depende del producto_id de la MISMA fila) que la variante fija, si viene,
     * pertenezca a ese producto.
     */
    private function sincronizarItems(Combo $combo, array $items): void
    {
        $idsConservar = collect($items)->pluck('id')->filter()->all();

        $combo->items()->whereNotIn('id', $idsConservar)->delete();

        foreach ($items as $index => $item) {
            $varianteId = $item['producto_variante_id'] ?? null;

            if ($varianteId !== null) {
                $variantePertenece = ProductoVariante::where('id', $varianteId)
                    ->where('producto_id', $item['producto_id'])
                    ->exists();

                if (! $variantePertenece) {
                    throw ValidationException::withMessages([
                        "items.{$index}.producto_variante_id" => 'Esa variante no pertenece al producto elegido en esta línea.',
                    ]);
                }
            }

            $atributos = [
                'producto_id' => $item['producto_id'],
                'producto_variante_id' => $varianteId,
                'cantidad' => $item['cantidad'],
                'orden' => $index,
            ];

            if (! empty($item['id'])) {
                $combo->items()->whereKey($item['id'])->update($atributos);
            } else {
                $combo->items()->create($atributos);
            }
        }
    }

    /**
     * Reglas de validación para el descuento propio del combo: a diferencia de
     * Ofertas (múltiples ofertas programadas, alcance, escalas), acá es un único
     * descuento con tipo/valor/vigencia/activo directo en el formulario del combo.
     * `descuento_activo` en false es válido con el resto de los campos vacíos
     * (combo sin descuento).
     */
    private function descuentoReglas(): array
    {
        return [
            'descuento_activo' => ['boolean'],
            'tipo_descuento' => ['nullable', 'required_if:descuento_activo,true', 'in:porcentaje,fijo'],
            'valor_descuento' => ['nullable', 'required_if:descuento_activo,true', 'numeric', 'gt:0'],
            'descuento_fecha_inicio' => ['nullable', 'date'],
            'descuento_fecha_fin' => ['nullable', 'date', 'after_or_equal:descuento_fecha_inicio'],
        ];
    }

    private function descuentoMensajes(): array
    {
        return [
            'tipo_descuento.required_if' => 'Elegí un tipo de descuento o desactivá el descuento del combo.',
            'valor_descuento.required_if' => 'El valor del descuento es obligatorio si el descuento está activo.',
            'valor_descuento.gt' => 'El valor del descuento debe ser mayor a 0.',
            'descuento_fecha_fin.after_or_equal' => 'La fecha de fin no puede ser anterior a la de inicio.',
        ];
    }

    private function datosDescuento(array $validated): array
    {
        $activo = $validated['descuento_activo'] ?? false;

        return [
            'tipo_descuento' => $activo ? $validated['tipo_descuento'] : null,
            'valor_descuento' => $activo ? $validated['valor_descuento'] : null,
            'descuento_fecha_inicio' => $activo ? ($validated['descuento_fecha_inicio'] ?? null) : null,
            'descuento_fecha_fin' => $activo ? ($validated['descuento_fecha_fin'] ?? null) : null,
            'descuento_activo' => $activo,
        ];
    }

    private function guardarMedia(Request $request, Combo $combo): void
    {
        if ($request->hasFile('imagenes')) {
            $imgPath = config('productos.img_path');
            $publicImgPath = public_path($imgPath);

            if (! file_exists($publicImgPath)) {
                mkdir($publicImgPath, 0755, true);
            }

            $maxOrden = $combo->media()->where('tipo', 'imagen')->max('orden') ?? -1;
            $tienePrincipal = $combo->media()->where('tipo', 'imagen')->where('is_principal', true)->exists();

            foreach ($request->file('imagenes') as $index => $imagen) {
                $filename = time() . '_' . $index . '_' . $imagen->getClientOriginalName();
                $imagen->move($publicImgPath, $filename);
                $relativePath = $imgPath . '/' . $filename;

                $esPrincipal = $request->filled('imagen_principal')
                    ? (int) $request->imagen_principal === $index
                    : (! $tienePrincipal && $index === 0);

                $combo->media()->create([
                    'tipo' => 'imagen',
                    'ruta' => $relativePath,
                    'orden' => $maxOrden + $index + 1,
                    'is_principal' => $esPrincipal,
                ]);
            }
        }

        if ($request->hasFile('videos')) {
            $videoPath = config('productos.video_path');
            $publicVideoPath = public_path($videoPath);

            if (! file_exists($publicVideoPath)) {
                mkdir($publicVideoPath, 0755, true);
            }

            $maxOrden = $combo->media()->where('tipo', 'video')->max('orden') ?? -1;

            foreach ($request->file('videos') as $index => $video) {
                $filename = time() . '_' . $index . '_' . $video->getClientOriginalName();
                $video->move($publicVideoPath, $filename);
                $relativePath = $videoPath . '/' . $filename;

                $combo->media()->create([
                    'tipo' => 'video',
                    'ruta' => $relativePath,
                    'orden' => $maxOrden + $index + 1,
                    'is_principal' => false,
                ]);
            }
        }
    }
}
