<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanPagoTarjeta extends Model
{
    use HasFactory;

    protected $table = 'planes_pago_tarjeta';

    protected $fillable = [
        'nombre',
        'cuotas',
        'recargo_porcentaje',
        'orden',
        'is_active',
    ];

    protected $casts = [
        'cuotas' => 'integer',
        'recargo_porcentaje' => 'decimal:2',
        'orden' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Pedidos que usaron este plan (vía el snapshot plan_pago_tarjeta_id, ver
     * Pedido::planPagoTarjeta()). Usado para bloquear el hard-delete del plan
     * una vez que ya fue usado, mismo criterio que CodigoDescuento::pedidos().
     */
    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class, 'plan_pago_tarjeta_id');
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('orden');
    }
}
