<?php

namespace App\Models;

use App\Enums\MotivoMovimientoStock;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoStock extends Model
{
    protected $table = 'movimientos_stock';

    protected $fillable = [
        'producto_id',
        'pedido_id',
        'cantidad',
        'motivo',
        'stock_resultante',
    ];

    protected $casts = [
        'motivo' => MotivoMovimientoStock::class,
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
