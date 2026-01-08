<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Categoria extends Model
{
    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function subcategorias(): HasMany
    {
        return $this->hasMany(Subcategoria::class);
    }

    /**
     * Relación muchos a muchos con Producto
     */
    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(Producto::class, 'categoria_producto');
    }
}
