<?php

namespace App\Http\Controllers;

use App\Enums\AlcanceOferta;
use App\Models\Addon;
use App\Models\Producto;
use App\Models\Categoria;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Subcategoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ProductoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $productos = Producto::with(['categorias', 'subcategorias', 'imagenPrincipal', 'ofertaVigente', 'escalasPrecio'])->get();
        
        return Inertia::render('Admin/Productos/Index', [
            'productos' => $productos,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $categorias = Categoria::all();
        $subcategorias = Subcategoria::with('categoria')->get();

        return Inertia::render('Admin/Productos/Create', [
            'categorias' => $categorias,
            'subcategorias' => $subcategorias,
            'addonsDisponibles' => Addon::activos()->get(),
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
            'stock' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'categorias' => 'array',
            'subcategorias' => 'array',
            'imagenes.*' => 'nullable|image|max:5120', // max 5MB
            'videos.*' => 'nullable|mimes:mp4,mov,avi,wmv|max:51200', // max 50MB
            'imagen_principal' => 'nullable|integer',
        ], $this->escalasPrecioReglas(), $this->variantesReglas(), $this->addonsReglas()), array_merge(
            $this->escalasPrecioMensajes(),
            $this->variantesMensajes(),
            $this->addonsMensajes()
        ));

        $producto = DB::transaction(function () use ($validated) {
            $producto = Producto::create([
                'titulo' => $validated['titulo'],
                'descripcion' => $validated['descripcion'] ?? null,
                'precio' => $validated['precio'],
                'stock' => $validated['stock'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'is_featured' => $validated['is_featured'] ?? false,
            ]);

            // Asociar categorías y subcategorías
            if (isset($validated['categorias'])) {
                $producto->categorias()->sync($validated['categorias']);
            }

            if (isset($validated['subcategorias'])) {
                $producto->subcategorias()->sync($validated['subcategorias']);
            }

            $this->sincronizarEscalasPrecio($producto, $validated['escalas_precio'] ?? []);
            $this->sincronizarVariantes($producto, $validated['variantes'] ?? []);
            $this->sincronizarAddons($producto, $validated['addons'] ?? []);

            return $producto;
        });

        // Guardar imágenes
        if ($request->hasFile('imagenes')) {
            $imgPath = config('productos.img_path');
            $publicImgPath = public_path($imgPath);

            // Crear directorio si no existe
            if (!file_exists($publicImgPath)) {
                mkdir($publicImgPath, 0755, true);
            }

            foreach ($request->file('imagenes') as $index => $imagen) {
                $filename = time() . '_' . $index . '_' . $imagen->getClientOriginalName();
                $imagen->move($publicImgPath, $filename);
                $relativePath = $imgPath . '/' . $filename;

                $esPrincipal = $request->filled('imagen_principal')
                    ? $request->imagen_principal == $index
                    : $index === 0;

                $producto->media()->create([
                    'tipo' => 'imagen',
                    'ruta' => $relativePath,
                    'orden' => $index,
                    'is_principal' => $esPrincipal,
                ]);
            }
        }

        // Guardar videos
        if ($request->hasFile('videos')) {
            $videoPath = config('productos.video_path');
            $publicVideoPath = public_path($videoPath);
            
            // Crear directorio si no existe
            if (!file_exists($publicVideoPath)) {
                mkdir($publicVideoPath, 0755, true);
            }
            
            foreach ($request->file('videos') as $index => $video) {
                $filename = time() . '_' . $index . '_' . $video->getClientOriginalName();
                $video->move($publicVideoPath, $filename);
                $relativePath = $videoPath . '/' . $filename;
                
                $producto->media()->create([
                    'tipo' => 'video',
                    'ruta' => $relativePath,
                    'orden' => $index,
                    'is_principal' => false,
                ]);
            }
        }

        return redirect()->route('productos.index')
            ->with('success', 'Producto creado exitosamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Producto $producto)
    {
        $producto->load(['categorias', 'subcategorias', 'media', 'escalasPrecio', 'variantes', 'addons']);
        $categorias = Categoria::all();
        $subcategorias = Subcategoria::with('categoria')->get();

        return Inertia::render('Admin/Productos/Edit', [
            'producto' => $producto,
            'categorias' => $categorias,
            'subcategorias' => $subcategorias,
            'addonsDisponibles' => Addon::activos()->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Producto $producto)
    {
        $validated = $request->validate(array_merge([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'categorias' => 'array',
            'subcategorias' => 'array',
            'imagenes.*' => 'nullable|image|max:5120',
            'videos.*' => 'nullable|mimes:mp4,mov,avi,wmv|max:51200',
            'media_eliminar' => 'array',
        ], $this->escalasPrecioReglas($producto), $this->variantesReglas($producto), $this->addonsReglas()), array_merge(
            $this->escalasPrecioMensajes(),
            $this->variantesMensajes(),
            $this->addonsMensajes()
        ));

        DB::transaction(function () use ($validated, $producto) {
            $producto->update([
                'titulo' => $validated['titulo'],
                'descripcion' => $validated['descripcion'] ?? null,
                'precio' => $validated['precio'],
                'stock' => $validated['stock'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'is_featured' => $validated['is_featured'] ?? false,
            ]);

            // Actualizar categorías y subcategorías
            if (isset($validated['categorias'])) {
                $producto->categorias()->sync($validated['categorias']);
            }

            if (isset($validated['subcategorias'])) {
                $producto->subcategorias()->sync($validated['subcategorias']);
            }

            $this->sincronizarEscalasPrecio($producto, $validated['escalas_precio'] ?? []);
            $this->sincronizarVariantes($producto, $validated['variantes'] ?? []);
            $this->sincronizarAddons($producto, $validated['addons'] ?? []);
        });

        // Eliminar media marcados para eliminar
        if (isset($validated['media_eliminar']) && is_array($validated['media_eliminar'])) {
            foreach ($validated['media_eliminar'] as $mediaId) {
                $media = $producto->media()->find($mediaId);
                if ($media) {
                    $filePath = public_path($media->ruta);
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                    $media->delete();
                }
            }
        }

        // Guardar nuevas imágenes
        if ($request->hasFile('imagenes')) {
            $imgPath = config('productos.img_path');
            $publicImgPath = public_path($imgPath);

            // Crear directorio si no existe
            if (!file_exists($publicImgPath)) {
                mkdir($publicImgPath, 0755, true);
            }

            $maxOrden = $producto->media()->where('tipo', 'imagen')->max('orden') ?? -1;
            $tienePrincipal = $producto->media()->where('tipo', 'imagen')->where('is_principal', true)->exists();

            foreach ($request->file('imagenes') as $index => $imagen) {
                $filename = time() . '_' . $index . '_' . $imagen->getClientOriginalName();
                $imagen->move($publicImgPath, $filename);
                $relativePath = $imgPath . '/' . $filename;

                $producto->media()->create([
                    'tipo' => 'imagen',
                    'ruta' => $relativePath,
                    'orden' => $maxOrden + $index + 1,
                    // Si el producto no tenía ninguna imagen marcada como principal,
                    // la primera imagen nueva pasa a serlo para que se muestre en catálogo/carrito.
                    'is_principal' => !$tienePrincipal && $index === 0,
                ]);
            }
        }

        // Guardar nuevos videos
        if ($request->hasFile('videos')) {
            $videoPath = config('productos.video_path');
            $publicVideoPath = public_path($videoPath);
            
            // Crear directorio si no existe
            if (!file_exists($publicVideoPath)) {
                mkdir($publicVideoPath, 0755, true);
            }
            
            $maxOrden = $producto->media()->where('tipo', 'video')->max('orden') ?? -1;
            foreach ($request->file('videos') as $index => $video) {
                $filename = time() . '_' . $index . '_' . $video->getClientOriginalName();
                $video->move($publicVideoPath, $filename);
                $relativePath = $videoPath . '/' . $filename;
                
                $producto->media()->create([
                    'tipo' => 'video',
                    'ruta' => $relativePath,
                    'orden' => $maxOrden + $index + 1,
                    'is_principal' => false,
                ]);
            }
        }

        return redirect()->route('productos.index')
            ->with('success', 'Producto actualizado exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     *
     * A diferencia de borrar una escala suelta (sincronizarEscalasPrecio), acá no hace
     * falta bloquear por ofertas específicas vigentes: tanto `producto_escalas_precio`
     * como `ofertas` cascadean (cascadeOnDelete) sobre producto_id, así que un borrado
     * de producto se lleva escalas Y ofertas juntas — nunca queda una oferta huérfana
     * reapuntando en silencio al precio base de OTRO producto.
     */
    public function destroy(Producto $producto)
    {
        $producto->delete();

        return redirect()->route('productos.index')
            ->with('success', 'Producto eliminado exitosamente');
    }

    /**
     * Toggle featured status
     */
    public function toggleFeatured(Producto $producto)
    {
        $producto->update([
            'is_featured' => !$producto->is_featured
        ]);

        return redirect()->back();
    }

    /**
     * Reglas de validación para el array escalas_precio. En edición ($producto
     * presente), valida además que cualquier id enviado pertenezca al producto
     * que se está editando.
     */
    private function escalasPrecioReglas(?Producto $producto = null): array
    {
        $reglas = [
            'escalas_precio' => ['array'],
            'escalas_precio.*.cantidad_minima' => ['required', 'integer', 'gt:1', 'distinct'],
            'escalas_precio.*.precio_unitario' => ['required', 'numeric', 'gt:0'],
        ];

        if ($producto !== null) {
            $reglas['escalas_precio.*.id'] = [
                'nullable',
                'integer',
                Rule::exists('producto_escalas_precio', 'id')->where(
                    fn ($query) => $query->where('producto_id', $producto->id)
                ),
            ];
        }

        return $reglas;
    }

    /**
     * Mensajes de validación indexados por fila (escalas_precio.{index}.campo),
     * para que el front pueda mostrar el error junto a la fila correspondiente.
     */
    private function escalasPrecioMensajes(): array
    {
        return [
            'escalas_precio.*.cantidad_minima.required' => 'La cantidad mínima es obligatoria.',
            'escalas_precio.*.cantidad_minima.integer' => 'La cantidad mínima debe ser un número entero.',
            'escalas_precio.*.cantidad_minima.gt' => 'La cantidad mínima debe ser mayor a 1.',
            'escalas_precio.*.cantidad_minima.distinct' => 'Hay una escala repetida con la misma cantidad mínima.',
            'escalas_precio.*.precio_unitario.required' => 'El precio unitario es obligatorio.',
            'escalas_precio.*.precio_unitario.numeric' => 'El precio unitario debe ser un número.',
            'escalas_precio.*.precio_unitario.gt' => 'El precio unitario debe ser mayor a 0.',
            'escalas_precio.*.id.exists' => 'La escala indicada no pertenece a este producto.',
        ];
    }

    /**
     * Sincroniza las escalas de precio del producto contra el payload recibido:
     * borra las que ya no vienen (por id) y hace upsert del resto. El id, cuando
     * viene, ya fue validado como perteneciente a este producto en escalasPrecioReglas().
     *
     * Antes de borrar, rechaza (ValidationException) cualquier escala que tenga una
     * Oferta vigente o futura con alcance=especifico apuntándole: `producto_escala_precio_id`
     * tiene nullOnDelete, así que sin este chequeo la oferta no se borra ni avisa, sino
     * que pasa a aplicar en silencio sobre el precio base del producto.
     */
    private function sincronizarEscalasPrecio(Producto $producto, array $escalas): void
    {
        $idsConservar = collect($escalas)->pluck('id')->filter()->all();

        $escalasAEliminar = $producto->escalasPrecio()->whereNotIn('id', $idsConservar)->get();

        $bloqueos = [];
        foreach ($escalasAEliminar as $escala) {
            $oferta = $this->ofertaBloqueanteDe($escala);
            if ($oferta !== null) {
                $bloqueos["escalas_precio_bloqueadas.{$escala->id}"] = sprintf(
                    'No se puede eliminar la escala de %d+ unidades: la oferta #%d (%s) la tiene como alcance específico. Eliminá o reasigná esa oferta primero.',
                    $escala->cantidad_minima,
                    $oferta->id,
                    $this->descripcionOferta($oferta)
                );
            }
        }

        if (!empty($bloqueos)) {
            throw ValidationException::withMessages($bloqueos);
        }

        $producto->escalasPrecio()->whereNotIn('id', $idsConservar)->delete();

        foreach ($escalas as $escala) {
            $atributos = [
                'cantidad_minima' => $escala['cantidad_minima'],
                'precio_unitario' => $escala['precio_unitario'],
            ];

            if (!empty($escala['id'])) {
                $producto->escalasPrecio()->whereKey($escala['id'])->update($atributos);
            } else {
                $producto->escalasPrecio()->create($atributos);
            }
        }
    }

    /**
     * Reglas de validación para el array variantes. En edición ($producto presente),
     * valida además que cualquier id enviado pertenezca al producto que se está editando.
     * `distinct` sobre nombre alcanza para "único dentro del mismo producto" porque el
     * sync reemplaza el set completo de variantes con lo que venga en el payload.
     */
    private function variantesReglas(?Producto $producto = null): array
    {
        $reglas = [
            'variantes' => ['array'],
            'variantes.*.nombre' => ['required', 'string', 'max:100', 'distinct'],
            'variantes.*.color_hex' => ['nullable', 'string', 'max:7'],
            'variantes.*.precio_adicional' => ['nullable', 'numeric', 'min:0'],
            'variantes.*.stock' => ['nullable', 'integer', 'min:0'],
            'variantes.*.is_active' => ['boolean'],
        ];

        if ($producto !== null) {
            $reglas['variantes.*.id'] = [
                'nullable',
                'integer',
                Rule::exists('producto_variantes', 'id')->where(
                    fn ($query) => $query->where('producto_id', $producto->id)
                ),
            ];
        }

        return $reglas;
    }

    /**
     * Mensajes de validación indexados por fila (variantes.{index}.campo), para que
     * el front pueda mostrar el error junto a la fila correspondiente.
     */
    private function variantesMensajes(): array
    {
        return [
            'variantes.*.nombre.required' => 'El nombre de la variante es obligatorio.',
            'variantes.*.nombre.distinct' => 'Hay una variante repetida con el mismo nombre.',
            'variantes.*.precio_adicional.numeric' => 'El precio adicional debe ser un número.',
            'variantes.*.precio_adicional.min' => 'El precio adicional no puede ser negativo.',
            'variantes.*.stock.integer' => 'El stock debe ser un número entero.',
            'variantes.*.stock.min' => 'El stock no puede ser negativo.',
            'variantes.*.id.exists' => 'La variante indicada no pertenece a este producto.',
        ];
    }

    /**
     * Sincroniza las variantes del producto contra el payload recibido: borra las que
     * ya no vengan (por id) y hace upsert del resto, mismo patrón que sincronizarEscalasPrecio.
     * `orden` se asigna según la posición dentro del array recibido (el front reordena
     * moviendo la fila entera, ver VariantesColorRepeater).
     */
    private function sincronizarVariantes(Producto $producto, array $variantes): void
    {
        $idsConservar = collect($variantes)->pluck('id')->filter()->all();

        $producto->variantes()->whereNotIn('id', $idsConservar)->delete();

        foreach ($variantes as $index => $variante) {
            $atributos = [
                'nombre' => $variante['nombre'],
                'color_hex' => $variante['color_hex'] ?? null,
                'precio_adicional' => $variante['precio_adicional'] ?? 0,
                'stock' => $variante['stock'] ?? null,
                'is_active' => $variante['is_active'] ?? true,
                'orden' => $index,
            ];

            if (!empty($variante['id'])) {
                $producto->variantes()->whereKey($variante['id'])->update($atributos);
            } else {
                $producto->variantes()->create($atributos);
            }
        }
    }

    /**
     * Reglas de validación para el array addons (el checklist de AddonsProductoSelector).
     * `precio_override` nulo/vacío significa "usar el precio por defecto del addon"
     * (ver columna producto_addon.precio_override).
     */
    private function addonsReglas(): array
    {
        return [
            'addons' => ['array'],
            'addons.*.addon_id' => ['required', 'integer', 'distinct', Rule::exists('addons', 'id')],
            'addons.*.precio_override' => ['nullable', 'numeric', 'min:0'],
            'addons.*.orden' => ['nullable', 'integer', 'min:0'],
        ];
    }

    private function addonsMensajes(): array
    {
        return [
            'addons.*.addon_id.required' => 'El add-on es obligatorio.',
            'addons.*.addon_id.distinct' => 'Hay un add-on repetido.',
            'addons.*.addon_id.exists' => 'El add-on indicado no existe.',
            'addons.*.precio_override.numeric' => 'El precio override debe ser un número.',
            'addons.*.precio_override.min' => 'El precio override no puede ser negativo.',
        ];
    }

    /**
     * Sincroniza la tabla pivot producto_addon vía sync(): reemplaza el set completo
     * de addons asociados por el payload recibido, con sus pivots precio_override y orden.
     */
    private function sincronizarAddons(Producto $producto, array $addons): void
    {
        $sync = [];

        foreach ($addons as $index => $addon) {
            $sync[$addon['addon_id']] = [
                'precio_override' => $addon['precio_override'] ?? null,
                'orden' => $addon['orden'] ?? $index,
            ];
        }

        $producto->addons()->sync($sync);
    }

    /**
     * Oferta activa, con alcance=especifico, que apunta a esta escala y sigue vigente
     * o todavía no terminó (fecha_fin nula o futura) — una oferta ya vencida no bloquea
     * el borrado porque PricingService/ofertaVigente() ya no la va a resolver nunca más.
     */
    private function ofertaBloqueanteDe(EscalaPrecio $escala): ?Oferta
    {
        return Oferta::query()
            ->where('producto_escala_precio_id', $escala->id)
            ->where('alcance', AlcanceOferta::Especifico)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('fecha_fin')->orWhere('fecha_fin', '>=', now());
            })
            ->first();
    }

    private function descripcionOferta(Oferta $oferta): string
    {
        $valor = (float) $oferta->valor_descuento;

        return $oferta->tipo_descuento?->value === 'porcentaje'
            ? "{$valor}% de descuento"
            : '$' . number_format($valor, 2) . ' de descuento';
    }
}
