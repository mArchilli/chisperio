<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubcategoriaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $categoriaId = $request->query('categoria_id');
        $categoria = null;
        
        if ($categoriaId) {
            $categoria = Categoria::findOrFail($categoriaId);
            $subcategorias = Subcategoria::where('categoria_id', $categoriaId)
                ->orderBy('nombre')
                ->get();
        } else {
            $subcategorias = Subcategoria::with('categoria')
                ->orderBy('nombre')
                ->get();
        }
        
        return Inertia::render('Subcategorias/Index', [
            'subcategorias' => $subcategorias,
            'categoria' => $categoria,
            'categoriaId' => $categoriaId
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $categoriaId = $request->query('categoria_id');
        $categorias = Categoria::orderBy('nombre')->get();
        
        return Inertia::render('Subcategorias/Create', [
            'categorias' => $categorias,
            'categoriaId' => $categoriaId
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'required|exists:categorias,id',
        ]);

        Subcategoria::create($validated);

        return redirect()->route('subcategorias.index', ['categoria_id' => $validated['categoria_id']])
            ->with('success', 'Subcategoría creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Subcategoria $subcategoria)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Subcategoria $subcategoria)
    {
        $categorias = Categoria::orderBy('nombre')->get();
        
        return Inertia::render('Subcategorias/Edit', [
            'subcategoria' => $subcategoria->load('categoria'),
            'categorias' => $categorias
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Subcategoria $subcategoria)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'required|exists:categorias,id',
        ]);

        $subcategoria->update($validated);

        return redirect()->route('subcategorias.index', ['categoria_id' => $validated['categoria_id']])
            ->with('success', 'Subcategoría actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Subcategoria $subcategoria)
    {
        $categoriaId = $subcategoria->categoria_id;
        $subcategoria->delete();

        return redirect()->route('subcategorias.index', ['categoria_id' => $categoriaId])
            ->with('success', 'Subcategoría eliminada exitosamente.');
    }
}
