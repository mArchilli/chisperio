<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Addon extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'descripcion',
        'precio',
        'requiere_texto',
        'placeholder_texto',
        'max_caracteres',
        'is_active',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'requiere_texto' => 'boolean',
        'max_caracteres' => 'integer',
        'is_active' => 'boolean',
    ];

    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(Producto::class, 'producto_addon')
            ->withPivot('precio_override', 'orden')
            ->withTimestamps();
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
