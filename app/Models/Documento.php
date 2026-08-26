<?php

namespace App\Models;

use App\Enums\TipoDocumento;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Documento extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'descripcion',
        'tipo',
        'url',
        'ruta',
        'orden',
        'is_active',
    ];

    protected $casts = [
        'tipo' => TipoDocumento::class,
        'orden' => 'integer',
        'is_active' => 'boolean',
    ];

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
