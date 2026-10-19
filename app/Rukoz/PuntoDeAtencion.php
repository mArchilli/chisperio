<?php

namespace App\Rukoz;

use App\Enums\Sucursal;

/**
 * Punto de atención del Central (`punto`: BA, CBA…) que le corresponde a un pedido de la web (11.4b).
 *
 * La web no decide el reparto acá: el pedido ya tiene su sucursal (la que sugiere la provincia del checkout —
 * `Sucursal::paraProvincia`, una sola regla para la tienda y el servidor— y que el cliente puede cambiar) y esta clase solo la
 * traduce al código del Central según `integracion.puntos`. Una sucursal sin código no manda `punto`: rige el predeterminado.
 */
final class PuntoDeAtencion
{
    /** El código de punto de una sucursal; `null` si no tiene (no se manda `punto`). */
    public static function codigoDe(?Sucursal $sucursal): ?string
    {
        $codigo = trim((string) config('integracion.puntos.'.($sucursal ?? Sucursal::BuenosAires)->value));

        return $codigo === '' ? null : $codigo;
    }

    /** El código de punto que corresponde a una provincia (la regla del checkout). */
    public static function codigoParaProvincia(?string $provincia): ?string
    {
        return self::codigoDe(Sucursal::paraProvincia($provincia));
    }

    /**
     * Cada sucursal contra los puntos del Central (`puntos` de GET /referencias): para `chisperio:integracion-estado`.
     *
     * @param  list<array<string, mixed>>  $puntosDelCentral
     * @return list<array{sucursal: Sucursal, codigo: string|null, existe: bool}>
     */
    public static function validar(array $puntosDelCentral): array
    {
        $codigos = array_column($puntosDelCentral, 'codigo');

        return array_map(fn (Sucursal $s) => [
            'sucursal' => $s,
            'codigo' => $codigo = self::codigoDe($s),
            'existe' => $codigo === null || in_array($codigo, $codigos, true),
        ], Sucursal::cases());
    }
}
