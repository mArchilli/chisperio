<?php

namespace App\Models;

use App\Enums\EstadoPedido;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $fillable = [
        'cliente_nombre',
        'cliente_dni',
        'cliente_telefono',
        'cliente_email',
        'cliente_provincia',
        'cliente_direccion',
        'cliente_codigo_postal',
        'observaciones',
        'subtotal',
        'total',
        'estado',
        'despachado_at',
    ];

    protected $casts = [
        'estado' => EstadoPedido::class,
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'despachado_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PedidoItem::class);
    }

    public function scopeFacturables(Builder $query): Builder
    {
        return $query->where('estado', '!=', EstadoPedido::Cancelado);
    }
}
