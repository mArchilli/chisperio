<?php

namespace App\Enums;

enum RolUsuario: string
{
    case Admin = 'admin';
    case Vendedor = 'vendedor';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Vendedor => 'Vendedor',
        };
    }
}
