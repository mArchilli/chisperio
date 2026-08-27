<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PlanPagoTarjetaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:60'],
            'cuotas' => ['required', 'integer', 'min:1'],
            'recargo_porcentaje' => ['required', 'numeric', 'min:0', 'max:999.99'],
            'orden' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del plan es obligatorio.',
            'cuotas.required' => 'La cantidad de cuotas es obligatoria.',
            'cuotas.min' => 'La cantidad de cuotas debe ser mayor a 0.',
            'recargo_porcentaje.required' => 'El recargo es obligatorio.',
            'recargo_porcentaje.numeric' => 'El recargo debe ser un número.',
            'recargo_porcentaje.min' => 'El recargo no puede ser negativo.',
        ];
    }
}
