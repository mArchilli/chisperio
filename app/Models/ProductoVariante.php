<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductoVariante extends Model
{
    use HasFactory;

    protected $table = 'producto_variantes';

    protected $fillable = [
        'producto_id',
        'nombre',
        'color_hex',
        'es_color_personalizado',
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
        'es_color_personalizado' => 'boolean',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Relación uno a muchos con ProductoMedia: imágenes/videos específicos de esta variante
     * (producto_media.producto_variante_id = este id). No incluye los medios generales.
     */
    public function mediaEspecifica(): HasMany
    {
        return $this->hasMany(ProductoMedia::class, 'producto_variante_id');
    }

    /**
     * true si esta fila representa la opción "Otro / a elección del cliente":
     * color_hex es solo referencia visual del ícono/swatch, no el color real pedido.
     */
    public function esPersonalizada(): bool
    {
        return (bool) $this->es_color_personalizado;
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
