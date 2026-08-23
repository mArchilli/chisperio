<?php

namespace App\Models;

use App\Enums\TipoDescuento;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodigoDescuento extends Model
{
    use HasFactory;

    protected $table = 'codigos_descuento';

    protected $fillable = [
        'codigo',
        'tipo_descuento',
        'valor_descuento',
        'activo',
        'vigente_desde',
        'vigente_hasta',
        'limite_usos',
        'usos_actuales',
    ];

    protected $casts = [
        'tipo_descuento' => TipoDescuento::class,
        'valor_descuento' => 'decimal:2',
        'activo' => 'boolean',
        'vigente_desde' => 'date',
        'vigente_hasta' => 'date',
        'limite_usos' => 'integer',
        'usos_actuales' => 'integer',
    ];

    /**
     * Pedidos que usaron este código (vía el snapshot codigo_descuento_id, ver
     * Pedido::codigoDescuento()). Usado para agregar el total efectivamente
     * descontado (ver CodigoDescuentoController::index) — no para reconstruir el
     * snapshot en sí, que vive en el propio Pedido.
     */
    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class, 'codigo_descuento_id');
    }

    /**
     * Verificar si el código está vigente: activo, dentro del rango de fechas
     * (null en cualquier punta = sin límite de ese lado) y con usos disponibles
     * (limite_usos null = sin límite). Compone los chequeos granulares de abajo,
     * que son la única fuente de verdad para cada uno (CodigoDescuentoService los
     * reusa para distinguir el motivo específico de invalidez, sin reimplementar
     * la comparación de fechas/límites).
     */
    public function estaVigente(): bool
    {
        return $this->activo
            && $this->yaComenzo()
            && ! $this->yaTermino()
            && $this->tieneUsosDisponibles();
    }

    /**
     * true si no tiene vigente_desde o si ya se alcanzó esa fecha (comparación por
     * día completo: un código con vigente_desde = hoy ya está vigente desde ahora).
     */
    public function yaComenzo(): bool
    {
        return $this->vigente_desde === null || now()->startOfDay()->gte($this->vigente_desde);
    }

    /**
     * true si tiene vigente_hasta y ya pasó (comparación por día completo: un
     * código con vigente_hasta = hoy todavía no se considera vencido).
     */
    public function yaTermino(): bool
    {
        return $this->vigente_hasta !== null && now()->startOfDay()->gt($this->vigente_hasta);
    }

    /**
     * true si no tiene limite_usos o si todavía no lo alcanzó.
     */
    public function tieneUsosDisponibles(): bool
    {
        return $this->limite_usos === null || $this->usos_actuales < $this->limite_usos;
    }
}
