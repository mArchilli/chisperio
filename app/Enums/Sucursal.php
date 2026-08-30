<?php

namespace App\Enums;

/**
 * Sucursales de atención. Los `value` coinciden con los `id` de
 * `WHATSAPP_SUCURSALES` en `resources/js/lib/whatsapp.js` (el selector del
 * checkout manda ese id) — no cambiar esa correspondencia.
 */
enum Sucursal: string
{
    case BuenosAires = 'buenos-aires';
    case Cordoba = 'cordoba';

    public function label(): string
    {
        return match ($this) {
            self::BuenosAires => 'Buenos Aires',
            self::Cordoba => 'Córdoba',
        };
    }
}
