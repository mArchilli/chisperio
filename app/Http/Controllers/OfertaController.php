<?php

namespace App\Http\Controllers;

use App\Models\Oferta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OfertaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $ofertas = Oferta::with('producto')->orderBy('created_at', 'desc')->get();
        
        return Inertia::render('Admin/Ofertas/Index', [
            'ofertas' => $ofertas,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $productos = Producto::where('is_active', true)->orderBy('titulo')->get();
        $productoPreseleccionado = $request->query('producto_id');
        
        return Inertia::render('Admin/Ofertas/Create', [
            'productos' => $productos,
            'productoPreseleccionado' => $productoPreseleccionado,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'precio_oferta' => 'required|numeric|min:0',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'is_active' => 'boolean',
        ]);

        // Obtener el producto para calcular el porcentaje
        $producto = Producto::findOrFail($validated['producto_id']);
        
        // Calcular el porcentaje de descuento
        $precioOriginal = floatval($producto->precio);
        $precioOferta = floatval($validated['precio_oferta']);
        $porcentajeDescuento = (($precioOriginal - $precioOferta) / $precioOriginal) * 100;

        // Validar que el precio de oferta sea menor al precio original
        if ($precioOferta >= $precioOriginal) {
            return back()->withErrors([
                'precio_oferta' => 'El precio de oferta debe ser menor al precio original del producto ($' . number_format($precioOriginal, 2) . ').'
            ]);
        }

        Oferta::create([
            'producto_id' => $validated['producto_id'],
            'precio_oferta' => $precioOferta,
            'porcentaje_descuento' => round($porcentajeDescuento, 2),
            'fecha_inicio' => $validated['fecha_inicio'] ?? null,
            'fecha_fin' => $validated['fecha_fin'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('ofertas.index')
            ->with('success', 'Oferta creada exitosamente.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Oferta $oferta)
    {
        $productos = Producto::where('is_active', true)->orderBy('titulo')->get();
        
        return Inertia::render('Admin/Ofertas/Edit', [
            'oferta' => $oferta->load('producto'),
            'productos' => $productos,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Oferta $oferta)
    {
        $validated = $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'precio_oferta' => 'required|numeric|min:0',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'is_active' => 'boolean',
        ]);

        // Obtener el producto para calcular el porcentaje
        $producto = Producto::findOrFail($validated['producto_id']);
        
        // Calcular el porcentaje de descuento
        $precioOriginal = floatval($producto->precio);
        $precioOferta = floatval($validated['precio_oferta']);
        $porcentajeDescuento = (($precioOriginal - $precioOferta) / $precioOriginal) * 100;

        // Validar que el precio de oferta sea menor al precio original
        if ($precioOferta >= $precioOriginal) {
            return back()->withErrors([
                'precio_oferta' => 'El precio de oferta debe ser menor al precio original del producto ($' . number_format($precioOriginal, 2) . ').'
            ]);
        }

        $oferta->update([
            'producto_id' => $validated['producto_id'],
            'precio_oferta' => $precioOferta,
            'porcentaje_descuento' => round($porcentajeDescuento, 2),
            'fecha_inicio' => $validated['fecha_inicio'] ?? null,
            'fecha_fin' => $validated['fecha_fin'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('ofertas.index')
            ->with('success', 'Oferta actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Oferta $oferta)
    {
        $oferta->delete();

        return redirect()->route('ofertas.index')
            ->with('success', 'Oferta eliminada exitosamente.');
    }

    /**
     * Toggle active status
     */
    public function toggleActive(Oferta $oferta)
    {
        $oferta->update([
            'is_active' => !$oferta->is_active
        ]);

        return back();
    }
}
