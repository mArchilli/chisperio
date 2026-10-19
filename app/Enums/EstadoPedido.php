<?php

namespace App\Enums;

enum EstadoPedido: string
{
    case Pendiente = 'pendiente';
    case Despachado = 'despachado';
    case Cancelado = 'cancelado';

    // 11.4 — Estados que llegan del Sistema Central una vez confirmada la venta. La web nunca los asigna a mano
    // (salvo `Confirmado`, que pone `ConfirmacionDeVenta` al confirmar): los refleja `EstadoDesdeCentral`.
    case Confirmado = 'confirmado';
    case Empaquetado = 'empaquetado';
    case Entregado = 'entregado';
    case Anulado = 'anulado';

    /**
     * Estados que cuentan como VENTA CERRADA para los pedidos de la web SOLA (sin `rukoz_ref`, flujo de siempre): solo
     * `despachado`. `pendiente` es una reserva todavía sin cerrar (se muestra aparte, como "pendientes") y `cancelado` no
     * suma nunca.
     *
     * @return array<int, self>
     */
    public static function estadosDeVentaLegacy(): array
    {
        return [self::Despachado];
    }

    /**
     * Estados de VENTA para los pedidos con `rukoz_ref` (11.4): la venta nace al confirmarla en el Central y cuenta
     * desde `confirmado_at`, sin esperar el despacho. `Anulado` (y `Cancelado`) no cuentan.
     *
     * @return array<int, self>
     */
    public static function estadosDeVentaCentral(): array
    {
        return [self::Confirmado, self::Empaquetado, self::Despachado, self::Entregado];
    }

    /**
     * Todos los estados que representan una venta, de cualquiera de los dos orígenes. Para filtrar de verdad hay que usar
     * `Pedido::ventas()`, que distingue por `rukoz_ref` (un `despachado` manual de un pedido reservado no es una venta).
     *
     * @return array<int, self>
     */
    public static function estadosDeVenta(): array
    {
        return [self::Despachado, self::Confirmado, self::Empaquetado, self::Entregado];
    }

    public function label(): string
    {
        return match ($this) {
            self::Pendiente => 'Pendiente',
            self::Confirmado => 'Confirmado',
            self::Empaquetado => 'Empaquetado',
            self::Despachado => 'Despachado',
            self::Entregado => 'Entregado',
            self::Cancelado => 'Cancelado',
            self::Anulado => 'Anulado',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pendiente => 'yellow',
            self::Confirmado => 'blue',
            self::Empaquetado => 'indigo',
            self::Despachado => 'green',
            self::Entregado => 'emerald',
            self::Cancelado, self::Anulado => 'red',
        };
    }

    /** ¿Este estado solo puede venir del Central? (la web no lo asigna a mano) */
    public function esDelCentral(): bool
    {
        return in_array($this, [self::Confirmado, self::Empaquetado, self::Entregado, self::Anulado], true);
    }

    /**
     * El estado de la web que le corresponde a lo que informa el Central (`pedido.*`), o `null` si no cambia el estado de
     * la web (`reservado` y `requiere_revision` son la reserva: el pedido sigue pendiente).
     *
     *   confirmado → Confirmado · empaquetado → Empaquetado · despachado → Despachado · retirado → Entregado
     *   anulado → Anulado · cancelado → Cancelado (reserva liberada)
     */
    public static function desdeCentral(string $estadoDelCentral): ?self
    {
        return match ($estadoDelCentral) {
            'confirmado' => self::Confirmado,
            'empaquetado' => self::Empaquetado,
            'despachado' => self::Despachado,
            'retirado' => self::Entregado,
            'anulado' => self::Anulado,
            'cancelado' => self::Cancelado,
            default => null,
        };
    }

    /**
     * Regla de edición de un pedido de la web sola: se puede editar mientras no esté cancelado (uno cancelado ya repuso su
     * stock y es terminal; un despachado también se corrige, el stock se ajusta por la diferencia). Los estados del Central
     * (11.4) nunca se editan en la web. Para un pedido con `rukoz_ref` manda `Pedido::esEditable()`.
     */
    public function esEditable(): bool
    {
        return in_array($this, [self::Pendiente, self::Despachado], true);
    }

    /**
     * Reglas de transición de estado de un pedido DE LA WEB SOLA (Fase 0 del plan de stock):
     * pendiente↔despachado es libre y no afecta stock; pendiente→cancelado es la única
     * forma de cancelar (repone stock); cancelado es terminal; despachado→cancelado
     * directo no está permitido, hay que volver primero a pendiente. Los estados del Central (11.4) no tienen
     * transiciones desde la web. Para un pedido con `rukoz_ref` manda `Pedido::puedeTransicionarA()`.
     */
    public function puedeTransicionarA(self $destino): bool
    {
        return match ($this) {
            self::Pendiente => in_array($destino, [self::Despachado, self::Cancelado], true),
            self::Despachado => $destino === self::Pendiente,
            default => false,
        };
    }
}
