<?php

namespace App\Http\Requests;

use App\Enums\TipoDescuento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CodigoDescuentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * El código se guarda siempre normalizado en mayúsculas y sin espacios, tanto
     * para la unicidad como para lo que termina persistido en la tabla.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->codigo)) {
            $this->merge([
                'codigo' => strtoupper(trim($this->codigo)),
            ]);
        }
    }

    public function rules(): array
    {
        $codigoDescuento = $this->route('codigos_descuento');

        return [
            'codigo' => [
                'required',
                'string',
                'max:50',
                'regex:/^\S+$/',
                Rule::unique('codigos_descuento', 'codigo')->ignore($codigoDescuento?->id),
            ],
            'tipo_descuento' => ['required', Rule::enum(TipoDescuento::class)],
            'valor_descuento' => array_filter([
                'required',
                'numeric',
                'gt:0',
                $this->input('tipo_descuento') === TipoDescuento::Porcentaje->value ? 'max:100' : null,
            ]),
            'vigente_desde' => ['nullable', 'date'],
            'vigente_hasta' => ['nullable', 'date', 'after_or_equal:vigente_desde'],
            'limite_usos' => ['nullable', 'integer', 'min:1'],
            'activo' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.required' => 'El código es obligatorio.',
            'codigo.regex' => 'El código no puede contener espacios.',
            'codigo.unique' => 'Ya existe un código de descuento con ese nombre.',
            'tipo_descuento.required' => 'Elegí un tipo de descuento.',
            'valor_descuento.required' => 'El valor del descuento es obligatorio.',
            'valor_descuento.numeric' => 'El valor del descuento debe ser un número.',
            'valor_descuento.gt' => 'El valor del descuento debe ser mayor a 0.',
            'valor_descuento.max' => 'Un descuento porcentual no puede superar el 100%.',
            'vigente_hasta.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
            'limite_usos.min' => 'El límite de usos debe ser mayor a 0.',
        ];
    }
}
