<?php

namespace App\Models;

use App\Enums\EstadoPedido;
use App\Enums\Sucursal;
use App\Enums\TipoDescuento;
use App\Rukoz\ConfirmacionDeVenta;
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
        'sucursal',
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
        'envio_gratis',
        'envio_gratis_monto_minimo',
        'editado_at',
        'codigo_descuento_consumido_at',
        'codigo_descuento_liberado_at',
        'rukoz_ref',
        'rukoz_version',
        'rukoz_estado',
        'motivo_cancelacion',
        'confirmado_at',
        'confirmando_at',
        'confirmado_por',
        'rukoz_numero_venta',
        'rukoz_total_venta',
        'rukoz_pagado',
        'rukoz_saldo',
        'envio_costo_cobrado',
        'rukoz_transportista',
        'rukoz_numero_seguimiento',
        'rukoz_url_seguimiento',
        'rukoz_empaquetado_at',
        'rukoz_retirado_at',
        'rukoz_anulado_at',
    ];

    /** Estados de la reserva en el Central (`pedidos.rukoz_estado`). */
    public const RESERVA_RESERVADA = 'reservado';

    public const RESERVA_CANCELADA = 'cancelado';

    /** El pedido local ya está cancelado pero el Central no respondió: la cancelación quedó en las compensaciones del paquete. */
    public const RESERVA_CANCELACION_PENDIENTE = 'cancelacion_pendiente';

    /** 11.4 — Estados de la venta en el Central (`pedidos.rukoz_estado`) una vez confirmada. */
    public const RESERVA_CONFIRMADA = 'confirmado';

    public const RESERVA_ANULADA = 'anulado';

    protected $casts = [
        'estado' => EstadoPedido::class,
        'sucursal' => Sucursal::class,
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'despachado_at' => 'datetime',
        'editado_at' => 'datetime',
        'codigo_descuento_consumido_at' => 'datetime',
        'codigo_descuento_liberado_at' => 'datetime',
        'rukoz_version' => 'integer',
        'confirmado_at' => 'datetime',
        'confirmando_at' => 'datetime',
        'rukoz_total_venta' => 'decimal:2',
        'rukoz_pagado' => 'decimal:2',
        'rukoz_saldo' => 'decimal:2',
        'envio_costo_cobrado' => 'decimal:2',
        'rukoz_empaquetado_at' => 'datetime',
        'rukoz_retirado_at' => 'datetime',
        'rukoz_anulado_at' => 'datetime',
        'envio_gratis' => 'boolean',
        'envio_gratis_monto_minimo' => 'decimal:2',
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

    /**
     * ¿El stock de este pedido lo lleva el Central (reservó al crearse)? Los pedidos sin `rukoz_ref` son los de
     * siempre: descuentan y reponen stock local, aunque el interruptor del checkout esté encendido.
     */
    public function usaCentral(): bool
    {
        return $this->rukoz_ref !== null;
    }

    /**
     * Pedido con reserva viva en el Central y todavía sin confirmar: se edita con `editarReserva` y se cancela con
     * `cancelarReserva`. Al confirmarse (11.4) `rukoz_estado` pasa a `confirmado` y deja de serlo.
     */
    public function tieneReservaAbierta(): bool
    {
        return $this->usaCentral()
            && $this->confirmado_at === null
            && in_array($this->rukoz_estado, [self::RESERVA_RESERVADA, 'requiere_revision'], true);
    }

    /**
     * 11.4 — ¿La venta de este pedido ya se confirmó en el Central? Desde ahí el pedido es de SOLO LECTURA en la web: las
     * correcciones se hacen en el Central (anular y rehacer). Sigue valiendo si después se empaquetó, despachó, entregó o anuló.
     */
    public function estaConfirmado(): bool
    {
        return $this->usaCentral() && $this->confirmado_at !== null;
    }

    /**
     * ¿Se puede editar el contenido (ítems, precios, cantidades, cliente, cupón, notas)? Un pedido con `rukoz_ref` solo
     * mientras su reserva siga abierta; uno confirmado, anulado o cancelado nunca. Los de la web sola, como siempre
     * (`EstadoPedido::esEditable`).
     */
    public function esEditable(): bool
    {
        if ($this->usaCentral()) {
            return $this->tieneReservaAbierta() && $this->estado->esEditable();
        }

        return $this->estado->esEditable();
    }

    /**
     * 11.4 — ¿Se puede confirmar la venta desde el admin? Pedido con reserva abierta (`reservado`: uno en `requiere_revision`
     * todavía no), pendiente y con el interruptor `INTEGRACION_CONFIRMACION` encendido.
     */
    public function puedeConfirmarse(): bool
    {
        return ConfirmacionDeVenta::activa()
            && $this->usaCentral()
            && $this->confirmado_at === null
            && $this->estado === EstadoPedido::Pendiente
            && $this->rukoz_estado === self::RESERVA_RESERVADA;
    }

    /**
     * Transiciones de estado que se piden DESDE LA WEB. Un pedido de la web sola sigue la regla de siempre
     * (`EstadoPedido::puedeTransicionarA`). Uno con `rukoz_ref`:
     *  - confirmado (o más allá) / anulado / cancelado: ninguna — el Central manda;
     *  - con reserva abierta: cancelar; y «despachado» manual solo si la confirmación está apagada (11.3: con la
     *    confirmación encendida «Confirmar venta» lo reemplaza, que es lo que manda la venta al Central).
     */
    public function puedeTransicionarA(EstadoPedido $destino): bool
    {
        if (! $this->usaCentral()) {
            return $this->estado->puedeTransicionarA($destino);
        }

        if ($this->estaConfirmado() || $this->estado->esDelCentral() || $this->estado === EstadoPedido::Cancelado) {
            return false;
        }

        if ($destino === EstadoPedido::Despachado && ConfirmacionDeVenta::activa()) {
            return false;
        }

        return $this->estado->puedeTransicionarA($destino);
    }

    /**
     * La fecha con la que cuenta la venta en las métricas: la confirmación en el Central para los pedidos con `rukoz_ref`
     * (`confirmado_at`), la de creación para los de siempre.
     */
    public function fechaDeVenta(): ?\Carbon\CarbonInterface
    {
        return $this->usaCentral() ? $this->confirmado_at : $this->created_at;
    }

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

    /**
     * Todo lo que no está cancelado (ventas + pendientes). Ya NO se usa para facturación ni
     * métricas de ingresos (ahí van ventas() y pendientes() por separado); queda para
     * lo que de verdad significa "no cancelado", como el total descontado por un cupón.
     */
    public function scopeFacturables(Builder $query): Builder
    {
        return $query->whereNotIn('estado', [EstadoPedido::Cancelado->value, EstadoPedido::Anulado->value]);
    }

    /**
     * Ventas cerradas. Dos orígenes (ver EstadoPedido):
     *  - pedidos de la web sola (sin `rukoz_ref`): los despachados, como siempre;
     *  - pedidos con `rukoz_ref` (11.4): los confirmados, empaquetados, despachados y entregados EN EL CENTRAL (con
     *    `confirmado_at`). Los anulados, los cancelados y las reservas sin confirmar no entran.
     */
    public function scopeVentas(Builder $query): Builder
    {
        $valores = fn (array $estados) => array_map(fn (EstadoPedido $estado) => $estado->value, $estados);

        return $query->where(function (Builder $q) use ($valores) {
            $q->where(fn (Builder $l) => $l->whereNull('rukoz_ref')->whereIn('estado', $valores(EstadoPedido::estadosDeVentaLegacy())))
                ->orWhere(fn (Builder $c) => $c->whereNotNull('rukoz_ref')->whereNotNull('confirmado_at')->whereIn('estado', $valores(EstadoPedido::estadosDeVentaCentral())));
        });
    }

    /**
     * Las ventas (`ventas()`) cuya FECHA DE VENTA cae en [$desde, $hasta]: `confirmado_at` para los pedidos con `rukoz_ref`,
     * `created_at` para los de siempre. Los límites van en la zona de la base (ver ZonaHoraria::rangoDelDia/rangoDelMes).
     */
    public function scopeVentasEntre(Builder $query, $desde, $hasta): Builder
    {
        return $query->ventas()->where(function (Builder $q) use ($desde, $hasta) {
            $q->where(fn (Builder $l) => $l->whereNull('rukoz_ref')->whereBetween('created_at', [$desde, $hasta]))
                ->orWhere(fn (Builder $c) => $c->whereNotNull('rukoz_ref')->whereBetween('confirmado_at', [$desde, $hasta]));
        });
    }

    /** Pedidos todavía sin cerrar: reservas que aún no son venta. */
    public function scopePendientes(Builder $query): Builder
    {
        return $query->where('estado', EstadoPedido::Pendiente);
    }

    /**
     * Restringe a los pedidos de una sucursal. `null` (admin sin filtro, o filtro
     * "todas") no aplica ninguna restricción. Se usa desde PedidoController y
     * DashboardController para separar lo que ve cada vendedor.
     */
    public function scopeDeSucursal(Builder $query, Sucursal|string|null $sucursal): Builder
    {
        if ($sucursal === null) {
            return $query;
        }

        return $query->where('sucursal', $sucursal instanceof Sucursal ? $sucursal->value : $sucursal);
    }
}
