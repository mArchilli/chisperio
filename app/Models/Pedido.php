<?php

namespace App\Models;

use App\Enums\EstadoPedido;
use App\Enums\TipoDescuento;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $fillable = [
        'cliente_nombre',
        'cliente_dni',
        'cliente_telefono',
        'cliente_email',
        'cliente_provincia',
        'cliente_ciudad',
        'cliente_codigo_postal',
        'observaciones',
        'subtotal',
        'total',
        'estado',
        'despachado_at',
        'codigo_descuento_id',
        'codigo_descuento_texto',
        'codigo_descuento_tipo',
        'codigo_descuento_valor',
        'descuento_monto',
        'plan_pago_tarjeta_id',
        'plan_pago_nombre',
        'plan_pago_cuotas',
        'recargo_porcentaje',
        'recargo_monto',
        'total_con_recargo',
    ];

    protected $casts = [
        'estado' => EstadoPedido::class,
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'despachado_at' => 'datetime',
        // Snapshot histórico del tipo de descuento usado, no el estado actual del código
        // (por eso es un string plano en la tabla, no la misma columna enum de
        // codigos_descuento — ver la migración). El cast a enum es solo para que el
        // valor se siga leyendo tipado en PHP.
        'codigo_descuento_tipo' => TipoDescuento::class,
        'codigo_descuento_valor' => 'decimal:2',
        'descuento_monto' => 'decimal:2',
        'plan_pago_cuotas' => 'integer',
        'recargo_porcentaje' => 'decimal:2',
        'recargo_monto' => 'decimal:2',
        'total_con_recargo' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PedidoItem::class);
    }

    public function movimientosStock(): HasMany
    {
        return $this->hasMany(MovimientoStock::class);
    }

    public function codigoDescuento(): BelongsTo
    {
        return $this->belongsTo(CodigoDescuento::class, 'codigo_descuento_id');
    }

    public function planPagoTarjeta(): BelongsTo
    {
        return $this->belongsTo(PlanPagoTarjeta::class, 'plan_pago_tarjeta_id');
    }

    public function scopeFacturables(Builder $query): Builder
    {
        return $query->where('estado', '!=', EstadoPedido::Cancelado);
    }
}
