<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductoVariante extends Model
{
    use HasFactory;

    protected $table = 'producto_variantes';

    protected $fillable = [
        'producto_id',
        'nombre',
        'color_hex',
        'precio_adicional',
        'stock',
        'sku',
        'orden',
        'is_active',
    ];

    protected $casts = [
        'precio_adicional' => 'decimal:2',
        'stock' => 'integer',
        'orden' => 'integer',
        'is_active' => 'boolean',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * `stock === null` significa stock ilimitado, mismo criterio que Producto.
     */
    public function tieneStockIlimitado(): bool
    {
        return $this->stock === null;
    }

    public function tieneStockDisponible(int $cantidad): bool
    {
        return $this->tieneStockIlimitado() || $this->stock >= $cantidad;
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
