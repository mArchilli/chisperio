<?php

namespace App\Http\Controllers;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\Oferta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OfertaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $ofertas = Oferta::with(['producto', 'escalaPrecio'])->orderBy('created_at', 'desc')->get();

        return Inertia::render('Admin/Ofertas/Index', [
            'ofertas' => $ofertas,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $productos = Producto::where('is_active', true)
            ->with('escalasPrecio')
            ->orderBy('titulo')
            ->get();
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
        $validator = Validator::make($request->all(), $this->ofertaReglas($request), $this->ofertaMensajes());
        $validator->after(fn ($v) => $this->validarSolapamiento($v, null));
        $validated = $validator->validate();

        Oferta::create([
            'producto_id' => $validated['producto_id'],
            // Legacy, columnas NOT NULL en la tabla; dejan de ser la fuente de verdad
            // del cálculo (ver PricingService) a partir de esta fase. Ver también
            // App\Console\Commands\BackfillOfertasDescuento y OfertaFactory.
            'precio_oferta' => 0,
            'porcentaje_descuento' => 0,
            'tipo_descuento' => $validated['tipo_descuento'],
            'valor_descuento' => $validated['valor_descuento'],
            'alcance' => $validated['alcance'],
            'producto_escala_precio_id' => $validated['producto_escala_precio_id'] ?? null,
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
        $productos = Producto::where('is_active', true)
            ->with('escalasPrecio')
            ->orderBy('titulo')
            ->get();

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
        $validator = Validator::make($request->all(), $this->ofertaReglas($request), $this->ofertaMensajes());
        $validator->after(fn ($v) => $this->validarSolapamiento($v, $oferta));
        $validated = $validator->validate();

        $oferta->update([
            'producto_id' => $validated['producto_id'],
            'tipo_descuento' => $validated['tipo_descuento'],
            'valor_descuento' => $validated['valor_descuento'],
            'alcance' => $validated['alcance'],
            'producto_escala_precio_id' => $validated['producto_escala_precio_id'] ?? null,
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

    /**
     * Reglas de validación para store/update. `producto_escala_precio_id` es el campo
     * más delicado: cuando alcance=especifico, null es un valor VÁLIDO (significa "precio
     * base", ver Oferta::escalaPrecio y PricingService::ofertaAplicaAEscala) — por eso no
     * puede usarse la regla 'required' (que rechaza null). Usamos 'present' en su lugar:
     * exige que la clave venga en el payload, pero permite que su valor sea null.
     */
    private function ofertaReglas(Request $request): array
    {
        $productoId = $request->input('producto_id');
        $alcanceInput = $request->input('alcance');
        $tipoDescuentoInput = $request->input('tipo_descuento');

        $reglaEscala = [
            'nullable',
            'integer',
            Rule::exists('producto_escalas_precio', 'id')->where(
                fn ($query) => $query->where('producto_id', $productoId)
            ),
        ];

        if ($alcanceInput === AlcanceOferta::Especifico->value) {
            array_unshift($reglaEscala, 'present');
        }

        return [
            'producto_id' => 'required|exists:productos,id',
            'tipo_descuento' => 'required|in:porcentaje,fijo',
            'valor_descuento' => array_filter([
                'required',
                'numeric',
                'gt:0',
                $tipoDescuentoInput === TipoDescuento::Porcentaje->value ? 'max:100' : null,
            ]),
            'alcance' => 'required|in:todos,especifico',
            'producto_escala_precio_id' => $reglaEscala,
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'is_active' => 'boolean',
        ];
    }

    private function ofertaMensajes(): array
    {
        return [
            'tipo_descuento.required' => 'Elegí un tipo de descuento.',
            'tipo_descuento.in' => 'El tipo de descuento debe ser porcentaje o valor fijo.',
            'valor_descuento.required' => 'El valor del descuento es obligatorio.',
            'valor_descuento.numeric' => 'El valor del descuento debe ser un número.',
            'valor_descuento.gt' => 'El valor del descuento debe ser mayor a 0.',
            'valor_descuento.max' => 'Un descuento porcentual no puede superar el 100%.',
            'alcance.required' => 'Elegí a qué precios aplica la oferta.',
            'alcance.in' => 'El alcance debe ser "todos" o "específico".',
            'producto_escala_precio_id.present' => 'Elegí a qué precio específico aplica la oferta.',
            'producto_escala_precio_id.exists' => 'La escala elegida no pertenece a este producto.',
        ];
    }

    /**
     * Regla de negocio: dos ofertas ACTIVAS no pueden competir por el mismo nivel de
     * precio del mismo producto en un rango de fechas superpuesto (mismo criterio de
     * vigencia que Producto::ofertaVigente(), pero comparando el rango de la oferta
     * nueva/editada contra el de cada oferta existente, no solo contra "ahora").
     *
     * "Mismo nivel de precio" depende del alcance de CADA oferta involucrada:
     *  - alcance=todos cubre TODOS los niveles de precio del producto (precio base +
     *    cada escala), así que choca con CUALQUIER otra oferta activa del producto,
     *    sin importar el alcance/escala de esa otra oferta.
     *  - alcance=especifico solo choca con: (a) otra oferta alcance=todos —porque esa
     *    ya cubre ese nivel específico igual—, o (b) otra oferta alcance=especifico
     *    que apunte a la MISMA producto_escala_precio_id (null = precio base incluido).
     *
     * Una oferta con is_active=false nunca choca con nada: mientras esté inactiva no
     * la resuelve Producto::ofertaVigente() ni PricingService, así que no hay ambigüedad
     * posible con ella.
     */
    private function validarSolapamiento(\Illuminate\Validation\Validator $validator, ?Oferta $ofertaActual): void
    {
        if ($validator->errors()->isNotEmpty()) {
            return;
        }

        $data = $validator->getData();

        if (! ($data['is_active'] ?? true)) {
            return;
        }

        $productoId = $data['producto_id'];
        $alcance = $data['alcance'];
        $escalaId = $data['producto_escala_precio_id'] ?? null;
        $fechaInicio = $data['fecha_inicio'] ?? null;
        $fechaFin = $data['fecha_fin'] ?? null;

        $query = Oferta::query()
            ->where('producto_id', $productoId)
            ->where('is_active', true)
            ->when($ofertaActual, fn ($q) => $q->where('id', '!=', $ofertaActual->id));

        // Superposición de rangos: null en un extremo = sin límite de ese lado.
        if ($fechaFin !== null) {
            $query->where(fn ($q) => $q->whereNull('fecha_inicio')->orWhere('fecha_inicio', '<=', $fechaFin));
        }

        if ($fechaInicio !== null) {
            $query->where(fn ($q) => $q->whereNull('fecha_fin')->orWhere('fecha_fin', '>=', $fechaInicio));
        }

        if ($alcance === AlcanceOferta::Especifico->value) {
            $query->where(function ($q) use ($escalaId) {
                $q->where('alcance', AlcanceOferta::Todos->value)
                    ->orWhere(function ($q2) use ($escalaId) {
                        $q2->where('alcance', AlcanceOferta::Especifico->value);
                        $escalaId === null
                            ? $q2->whereNull('producto_escala_precio_id')
                            : $q2->where('producto_escala_precio_id', $escalaId);
                    });
            });
        }
        // alcance=todos: no hace falta filtrar más — cualquier otra oferta activa
        // y con fechas superpuestas ya compite con esta, sea cual sea su alcance.

        if ($query->exists()) {
            $validator->errors()->add(
                'alcance',
                'Ya existe una oferta activa para este producto que cubre este mismo nivel de precio en un rango de fechas superpuesto.'
            );
        }
    }
}
