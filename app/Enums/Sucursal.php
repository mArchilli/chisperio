<?php

namespace App\Enums;

use Illuminate\Support\Str;

/**
 * Sucursales de atención. Los `value` coinciden con los `id` de
 * `WHATSAPP_SUCURSALES` en `resources/js/lib/whatsapp.js` (el selector del
 * checkout manda ese id) — no cambiar esa correspondencia.
 *
 * Qué provincia atiende cada sucursal está en `resources/data/provincias-por-sucursal.json`: una sola fuente para el checkout
 * (que la sugiere, `sucursalSugeridaId` en `whatsapp.js`) y para el servidor (`paraProvincia`, que decide el punto de atención
 * del pedido en el Central cuando cambia la provincia).
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

    /**
     * La sucursal que atiende `$provincia`; sin provincia o sin coincidencia, la de por defecto (Buenos Aires). La comparación
     * ignora mayúsculas, acentos y espacios de más, porque en el admin la provincia es texto libre.
     */
    public static function paraProvincia(?string $provincia): self
    {
        $regla = self::reglaDeProvincias();
        $buscada = self::normalizarProvincia($provincia);

        if ($buscada !== '') {
            foreach ($regla['provincias'] as $sucursal => $provincias) {
                foreach ($provincias as $nombre) {
                    if (self::normalizarProvincia($nombre) === $buscada) {
                        return self::tryFrom($sucursal) ?? self::from($regla['defecto']);
                    }
                }
            }
        }

        return self::from($regla['defecto']);
    }

    /** @return array{defecto: string, provincias: array<string, list<string>>} */
    private static function reglaDeProvincias(): array
    {
        static $regla = null;

        return $regla ??= json_decode((string) file_get_contents(resource_path('data/provincias-por-sucursal.json')), true);
    }

    private static function normalizarProvincia(?string $provincia): string
    {
        return Str::lower(Str::ascii(trim((string) preg_replace('/\s+/u', ' ', (string) $provincia))));
    }
}
