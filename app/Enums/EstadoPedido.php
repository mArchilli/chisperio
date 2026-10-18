<?php

namespace App\Enums;

enum EstadoPedido: string
{
    case Pendiente = 'pendiente';
    case Despachado = 'despachado';
    case Cancelado = 'cancelado';

    /**
     * Estados que cuentan como VENTA CERRADA en las métricas y la facturación del panel.
     * Hoy solo `despachado`: el pedido salió, la venta se concretó. `pendiente` es una
     * reserva todavía sin cerrar (se muestra aparte, como "pendientes") y `cancelado` no
     * suma nunca. Cuando se sumen los estados de la integración con el Sistema Central
     * (confirmado, empaquetado, retirado...) los que representen una venta confirmada se
     * agregan acá y todas las métricas los toman solas.
     *
     * @return array<int, self>
     */
    public static function estadosDeVenta(): array
    {
        return [self::Despachado];
    }

    public function esVenta(): bool
    {
        return in_array($this, self::estadosDeVenta(), true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Pendiente => 'Pendiente',
            self::Despachado => 'Despachado',
            self::Cancelado => 'Cancelado',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pendiente => 'yellow',
            self::Despachado => 'green',
            self::Cancelado => 'red',
        };
    }

    /**
     * Se puede editar el contenido del pedido (productos, cantidades, datos del cliente)
     * mientras no esté cancelado: uno cancelado ya repuso su stock y es terminal. Un
     * despachado también, porque un error de carga o un cambio acordado con el cliente se
     * corrige igual; el stock se ajusta por la diferencia.
     */
    public function esEditable(): bool
    {
        return $this !== self::Cancelado;
    }

    /**
     * Reglas de transición de estado de un pedido (Fase 0 del plan de stock):
     * pendiente↔despachado es libre y no afecta stock; pendiente→cancelado es la única
     * forma de cancelar (repone stock); cancelado es terminal; despachado→cancelado
     * directo no está permitido, hay que volver primero a pendiente.
     */
    public function puedeTransicionarA(self $destino): bool
    {
        return match ($this) {
            self::Pendiente => in_array($destino, [self::Despachado, self::Cancelado], true),
            self::Despachado => $destino === self::Pendiente,
            self::Cancelado => false,
        };
    }
}
