<?php

namespace App\Enums;

enum TipoDocumento: string
{
    case Link = 'link';
    case Pdf = 'pdf';

    public function label(): string
    {
        return match ($this) {
            self::Link => 'Link (Drive u otro)',
            self::Pdf => 'Archivo PDF',
        };
    }
}
