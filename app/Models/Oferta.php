<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Oferta extends Model
{
    protected $fillable = [
        'producto_id',
        'precio_oferta',
        'porcentaje_descuento',
        'fecha_inicio',
        'fecha_fin',
        'is_active',
    ];

    protected $casts = [
        'precio_oferta' => 'decimal:2',
        'porcentaje_descuento' => 'decimal:2',
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Relación con Producto
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Verificar si la oferta está vigente
     */
    public function estaVigente(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $ahora = now();

        // Si tiene fecha de inicio y aún no comenzó
        if ($this->fecha_inicio && $ahora->lt($this->fecha_inicio)) {
            return false;
        }

        // Si tiene fecha de fin y ya terminó
        if ($this->fecha_fin && $ahora->gt($this->fecha_fin)) {
            return false;
        }

        return true;
    }
}
