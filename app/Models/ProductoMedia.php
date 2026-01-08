<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductoMedia extends Model
{
    protected $table = 'producto_media';

    protected $fillable = [
        'producto_id',
        'tipo',
        'ruta',
        'orden',
        'is_principal',
    ];

    protected $casts = [
        'orden' => 'integer',
        'is_principal' => 'boolean',
    ];

    /**
     * Relación con Producto
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Verificar si es una imagen
     */
    public function esImagen(): bool
    {
        return $this->tipo === 'imagen';
    }

    /**
     * Verificar si es un video
     */
    public function esVideo(): bool
    {
        return $this->tipo === 'video';
    }
}
