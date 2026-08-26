<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'precio' => ['required', 'numeric', 'min:0'],
            'requiere_texto' => ['boolean'],
            'placeholder_texto' => [
                $this->boolean('requiere_texto') ? 'required' : 'nullable',
                'string',
                'max:255',
            ],
            'max_caracteres' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del add-on es obligatorio.',
            'precio.required' => 'El precio es obligatorio.',
            'precio.numeric' => 'El precio debe ser un número.',
            'precio.min' => 'El precio no puede ser negativo.',
            'placeholder_texto.required' => 'Definí un placeholder para el texto que va a escribir el cliente.',
            'max_caracteres.min' => 'El máximo de caracteres debe ser mayor a 0.',
        ];
    }
}
