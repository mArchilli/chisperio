<?php

namespace App\Models;

use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Oferta extends Model
{
    use HasFactory;

    protected $fillable = [
        'producto_id',
        'precio_oferta',
        'porcentaje_descuento',
        'tipo_descuento',
        'valor_descuento',
        'alcance',
        'producto_escala_precio_id',
        'fecha_inicio',
        'fecha_fin',
        'is_active',
    ];

    protected $casts = [
        'precio_oferta' => 'decimal:2',
        'porcentaje_descuento' => 'decimal:2',
        'tipo_descuento' => TipoDescuento::class,
        'valor_descuento' => 'decimal:2',
        'alcance' => AlcanceOferta::class,
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
     * Relación opcional con la escala de precio a la que aplica esta oferta.
     * null = aplica sobre el precio base del producto.
     */
    public function escalaPrecio(): BelongsTo
    {
        return $this->belongsTo(EscalaPrecio::class, 'producto_escala_precio_id');
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
