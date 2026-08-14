<?php

namespace App\Services;

use App\DataTransferObjects\PriceResult;
use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;

class PricingService
{
    /**
     * Calcula el precio unitario final de un producto para una cantidad dada,
     * resolviendo la escala de precio aplicable y, si corresponde, el descuento
     * de la oferta vigente sobre ese nivel de precio.
     */
    public function calcularPrecio(Producto $producto, int $cantidad): PriceResult
    {
        $escalaAplicada = $producto->escalaAplicable($cantidad);
        $precioLista = round((float) ($escalaAplicada?->precio_unitario ?? $producto->precio), 2);

        $oferta = $producto->ofertaVigente;

        $ofertaAplicada = null;
        $precioFinal = $precioLista;

        if ($oferta !== null && $this->ofertaAplicaAEscala($oferta, $escalaAplicada)) {
            $descuento = $this->calcularPrecioConDescuento($oferta, $precioLista);

            if ($descuento !== null) {
                $ofertaAplicada = $oferta;
                $precioFinal = $descuento;
            }
        }

        $ahorroUnitario = round(max(0, $precioLista - $precioFinal), 2);
        $ahorroPorcentaje = $precioLista > 0
            ? round(($ahorroUnitario / $precioLista) * 100, 2)
            : 0.0;

        return new PriceResult(
            precio_lista: $precioLista,
            precio_unitario_final: $precioFinal,
            oferta_aplicada: $ofertaAplicada,
            escala_aplicada: $escalaAplicada,
            ahorro_unitario: $ahorroUnitario,
            ahorro_porcentaje: $ahorroPorcentaje,
        );
    }

    /**
     * Determina si la oferta vigente aplica al nivel de precio resuelto
     * (precio base o una escala específica).
     */
    private function ofertaAplicaAEscala(Oferta $oferta, ?EscalaPrecio $escalaAplicada): bool
    {
        if ($oferta->alcance === AlcanceOferta::Especifico) {
            $escalaId = $oferta->producto_escala_precio_id !== null
                ? (int) $oferta->producto_escala_precio_id
                : null;

            return $escalaId === $escalaAplicada?->id;
        }

        return true;
    }

    /**
     * Devuelve el precio con el descuento de la oferta aplicado, clampeado a 0
     * y redondeado a 2 decimales. Null si la oferta no tiene descuento configurado
     * (ofertas legacy aún no migradas por el backfill de tipo_descuento/valor_descuento).
     */
    private function calcularPrecioConDescuento(Oferta $oferta, float $precioLista): ?float
    {
        if ($oferta->tipo_descuento === null || $oferta->valor_descuento === null) {
            return null;
        }

        $valor = (float) $oferta->valor_descuento;

        $precio = match ($oferta->tipo_descuento) {
            TipoDescuento::Porcentaje => $precioLista * (1 - $valor / 100),
            TipoDescuento::Fijo => $precioLista - $valor,
        };

        return round(max(0.0, $precio), 2);
    }
}
