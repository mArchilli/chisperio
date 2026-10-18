<?php

namespace App\Rukoz;

use Illuminate\Support\Facades\Log;
use Rukoz\CoreClient\Errores\CentralNoDisponibleException;
use Rukoz\CoreClient\Errores\IntegracionApagadaException;
use Rukoz\CoreClient\Errores\PedidoNoEditableException;
use Rukoz\CoreClient\Errores\RukozException;
use Rukoz\CoreClient\Errores\SinStockException;
use Throwable;

/**
 * Traduce lo que contesta el Central (excepciones del paquete) a lo que ve quien compra o edita. Se decide siempre por el
 * tipo de excepción / `codigo()`, nunca por el texto. Ningún mensaje lleva códigos técnicos ni datos del cliente.
 */
final class ErroresDelCentral
{
    public const MENSAJE_CENTRAL_CAIDO = 'No pudimos confirmar el stock en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.';

    /**
     * Un mensaje por cada línea que no alcanza, nombrando el producto y el color, con las mismas palabras que el chequeo
     * contra el espejo («No queda stock de X (Color).» / «Solo quedan N unidades de X (pediste M).»).
     *
     * @return list<array{clave: string, mensaje: string}> `clave`: `stock.{producto_id}` o `stock.combo.{combo_id}` (la usa el checkout).
     */
    public static function sinStock(SinStockException $e, PedidoArmado $armado): array
    {
        $mensajes = [];

        foreach ($e->items() as $falta) {
            $linea = $armado->lineas[(int) ($falta['indice'] ?? -1)] ?? null;

            if ($linea === null) {
                $mensajes[] = ['clave' => 'stock.pedido', 'mensaje' => 'No queda stock suficiente de alguno de los productos del pedido.'];

                continue;
            }

            $nombre = $linea['titulo'].($linea['variante'] !== null ? ' ('.$linea['variante'].')' : '');
            $esCombo = $linea['combo_id'] !== null;
            $disponible = max(0, (int) ($falta['disponible'] ?? 0));
            $pedido = (int) ($falta['pedido'] ?? $linea['cantidad']);

            $mensajes[] = [
                'clave' => $esCombo ? 'stock.combo.'.$linea['combo_id'] : 'stock.'.($linea['producto_id'] ?? 'pedido'),
                'mensaje' => match (true) {
                    $disponible > 0 && $esCombo => "Solo quedan {$disponible} combos \"{$nombre}\" (pediste {$pedido}). Ajustá la cantidad.",
                    $disponible > 0 => "Solo quedan {$disponible} unidades de {$nombre} (pediste {$pedido}). Ajustá la cantidad.",
                    $esCombo => "No queda stock del combo \"{$nombre}\".",
                    default => "No queda stock de {$nombre}.",
                },
            ];
        }

        return $mensajes === []
            ? [['clave' => 'stock.pedido', 'mensaje' => 'No queda stock suficiente de alguno de los productos del pedido.']]
            : $mensajes;
    }

    /**
     * Ítems del Central (`[tipo, id]`) cuyo stock hay que releer porque la reserva no alcanzó: el de cada línea señalada.
     *
     * @return list<array{0: string, 1: string}>
     */
    public static function paresParaRefrescar(SinStockException $e, PedidoArmado $armado): array
    {
        $pares = [];

        foreach ($e->items() as $falta) {
            foreach ($armado->lineas[(int) ($falta['indice'] ?? -1)]['stock'] ?? [] as $par) {
                $pares[$par[0].':'.$par[1]] = $par;
            }

            if (isset($falta['tipo'], $falta['id'])) {
                $pares[$falta['tipo'].':'.$falta['id']] = [(string) $falta['tipo'], (string) $falta['id']];
            }
        }

        return array_values($pares);
    }

    /** Mensaje para el admin cuando el Central no deja editar o cancelar. */
    public static function paraElAdmin(Throwable $e, string $accion): string
    {
        return match (true) {
            $e instanceof CentralNoDisponibleException => "No pudimos comunicarnos con el Sistema Central, así que no se pudo {$accion}. No se guardó ningún cambio: probá de nuevo en unos minutos.",
            $e instanceof IntegracionApagadaException => "La integración con el Sistema Central está apagada y este pedido tiene stock reservado allá: no se puede {$accion} hasta volver a encenderla.",
            $e instanceof PedidoNoEditableException => 'Este pedido ya no está en reserva en el Sistema Central'.($e->estado() !== null ? " (estado: {$e->estado()})" : '').': no se puede '.$accion.' desde acá.',
            default => "El Sistema Central rechazó la operación y no se pudo {$accion}. Avisá a soporte.",
        };
    }

    /** Para lo que no es culpa de quien compra ni del admin: queda en el log del servidor, sin datos del cliente. */
    public static function registrar(RukozException $e, string $contexto): void
    {
        Log::warning("Sistema Central: {$contexto} — {$e->codigo()} (HTTP {$e->http()})", ['request_id' => $e->requestId()]);
    }
}
