<?php

namespace App\Enums;

enum EstadoPedido: string
{
    case Pendiente = 'pendiente';
    case Despachado = 'despachado';
    case Cancelado = 'cancelado';

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
