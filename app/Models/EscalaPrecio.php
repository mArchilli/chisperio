<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EscalaPrecio extends Model
{
    use HasFactory;

    protected $table = 'producto_escalas_precio';

    protected $fillable = [
        'producto_id',
        'cantidad_minima',
        'precio_unitario',
    ];

    protected $casts = [
        'cantidad_minima' => 'integer',
        'precio_unitario' => 'decimal:2',
    ];

    /**
     * Relación con Producto
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }
}
