<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $productos = Producto::with(['categorias', 'subcategorias', 'imagenPrincipal', 'ofertaVigente'])->get();
        
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
            'subcategorias' => $subcategorias
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'categorias' => 'array',
            'subcategorias' => 'array',
            'imagenes.*' => 'nullable|image|max:5120', // max 5MB
            'videos.*' => 'nullable|mimes:mp4,mov,avi,wmv|max:51200', // max 50MB
            'imagen_principal' => 'nullable|integer',
        ]);

        $producto = Producto::create([
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'] ?? null,
            'precio' => $validated['precio'],
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
        $producto->load(['categorias', 'subcategorias', 'media']);
        $categorias = Categoria::all();
        $subcategorias = Subcategoria::with('categoria')->get();
        
        return Inertia::render('Admin/Productos/Edit', [
            'producto' => $producto,
            'categorias' => $categorias,
            'subcategorias' => $subcategorias
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Producto $producto)
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'categorias' => 'array',
            'subcategorias' => 'array',
            'imagenes.*' => 'nullable|image|max:5120',
            'videos.*' => 'nullable|mimes:mp4,mov,avi,wmv|max:51200',
            'media_eliminar' => 'array',
        ]);

        $producto->update([
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'] ?? null,
            'precio' => $validated['precio'],
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
}
