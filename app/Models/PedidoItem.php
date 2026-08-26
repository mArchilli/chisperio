<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoItem extends Model
{
    protected $fillable = [
        'pedido_id',
        'producto_id',
        'producto_variante_id',
        'titulo',
        'precio_unitario',
        'cantidad',
        'subtotal',
        'variante_nombre',
        'variante_color_hex',
        'color_personalizado_texto',
        'recargo_variante_unitario',
        'addons_seleccionados',
        'addons_total_unitario',
        'precio_base_unitario',
    ];

    protected $casts = [
        'precio_unitario' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'recargo_variante_unitario' => 'decimal:2',
        'addons_seleccionados' => 'array',
        'addons_total_unitario' => 'decimal:2',
        'precio_base_unitario' => 'decimal:2',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function productoVariante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class);
    }
}
