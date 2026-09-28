<?php

namespace App\Services;

use App\DataTransferObjects\ComboPriceResult;
use App\DataTransferObjects\PriceResult;
use App\Enums\AlcanceOferta;
use App\Enums\TipoDescuento;
use App\Exceptions\VarianteRequeridaException;
use App\Models\Addon;
use App\Models\Combo;
use App\Models\EscalaPrecio;
use App\Models\Oferta;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PricingService
{
    /**
     * Calcula el precio unitario final de un producto para una cantidad dada,
     * resolviendo la escala de precio aplicable y, si corresponde, el descuento
     * de la oferta vigente sobre ese nivel de precio.
     *
     * Si se pasan $varianteId y/o $addonIds, además suma el recargo de variante y
     * el total de add-ons por encima del precio ya descontado: la oferta se calcula
     * SIEMPRE solo sobre precio_lista (base o escala), nunca sobre variante/add-ons,
     * porque esas opciones no tienen descuento propio.
     *
     * $exigirVariante: false por defecto para no romper los usos de "precio de
     * vidriera" (TiendaController::show/precio, TablaPreciosPorCantidad) que
     * deliberadamente calculan sin variante todavía elegida. El checkout
     * (PedidoController::store) es el único caller que lo pasa en true, como
     * defensa en profundidad detrás del guard explícito que ya corre ahí antes de
     * llegar a este método — ver resolverVariante().
     *
     * $cantidadParaEscala: si se pasa, resuelve la escala de precio con ESE número
     * en vez de $cantidad. Lo usa el checkout cuando una misma compra reparte un
     * producto en varias líneas (una por color): las N unidades totales definen el
     * tramo de precio por cantidad, no la cantidad de cada línea suelta. $cantidad
     * sigue siendo la de la línea (para el subtotal, que lo calcula el caller).
     */
    public function calcularPrecio(
        Producto $producto,
        int $cantidad,
        ?int $varianteId = null,
        array $addonIds = [],
        bool $exigirVariante = false,
        ?int $cantidadParaEscala = null
    ): PriceResult {
        $escalaAplicada = $producto->escalaAplicable($cantidadParaEscala ?? $cantidad);
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

        $varianteAplicada = $this->resolverVariante($producto, $varianteId, $exigirVariante);
        $recargoVariante = round((float) ($varianteAplicada?->precio_adicional ?? 0), 2);

        $addonsAplicados = $this->resolverAddons($producto, $addonIds);
        $addonsTotal = round(
            $addonsAplicados->sum(fn (Addon $addon) => (float) ($addon->pivot->precio_override ?? $addon->precio)),
            2
        );

        $precioFinalConOpciones = round($precioFinal + $recargoVariante + $addonsTotal, 2);

        return new PriceResult(
            precio_lista: $precioLista,
            precio_unitario_final: $precioFinal,
            oferta_aplicada: $ofertaAplicada,
            escala_aplicada: $escalaAplicada,
            ahorro_unitario: $ahorroUnitario,
            ahorro_porcentaje: $ahorroPorcentaje,
            variante_aplicada: $varianteAplicada,
            recargo_variante: $recargoVariante,
            addons_aplicados: $addonsAplicados->all(),
            addons_total: $addonsTotal,
            precio_final_con_opciones: $precioFinalConOpciones,
        );
    }

    /**
     * No confía en que el front mande una variante válida: tiene que pertenecer al
     * producto (la relación ya lo garantiza) y estar activa. Si el id no resuelve
     * ninguna fila, es un dato corrupto/manipulado del cliente — se rechaza con 422
     * en vez de ignorarlo en silencio.
     *
     * $varianteId === null normalmente significa "producto sin variantes, precio
     * base" — pero con $exigirVariante = true (solo el checkout) un producto que sí
     * tiene variantes activas y no trajo ninguna es en sí mismo un dato inválido:
     * lanza VarianteRequeridaException en vez de calcular un precio incompleto
     * (sin recargo) y dejar el item sin color registrado.
     */
    private function resolverVariante(Producto $producto, ?int $varianteId, bool $exigirVariante = false): ?ProductoVariante
    {
        if ($varianteId === null) {
            if ($exigirVariante && $producto->variantesActivas()->exists()) {
                throw new VarianteRequeridaException($producto->id);
            }

            return null;
        }

        $variante = $producto->variantesActivas()->whereKey($varianteId)->first();

        if ($variante === null) {
            throw ValidationException::withMessages([
                'variante_id' => 'La variante indicada no existe, no está activa o no pertenece a este producto.',
            ]);
        }

        return $variante;
    }

    /**
     * Mismo criterio que resolverVariante: cada addon_id debe estar asociado a ESTE
     * producto (vía producto_addon) y activo. Un id que no resuelve ninguna fila
     * rechaza toda la request (nunca se suma un addon no asociado en silencio).
     */
    private function resolverAddons(Producto $producto, array $addonIds): Collection
    {
        $idsUnicos = collect($addonIds)->filter()->unique()->values();

        if ($idsUnicos->isEmpty()) {
            return collect();
        }

        $addons = $producto->addonsActivos()->whereIn('addons.id', $idsUnicos)->get();

        if ($addons->count() !== $idsUnicos->count()) {
            $idsFaltantes = $idsUnicos->diff($addons->pluck('id'))->values();

            throw ValidationException::withMessages([
                'addon_ids' => "Los add-ons [{$idsFaltantes->implode(', ')}] no están asociados o activos para este producto.",
            ]);
        }

        return $addons;
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

    /**
     * Precio de un combo: a diferencia de calcularPrecio(), no hay escalas por
     * cantidad ni recargo de variante ni add-ons — el precio del combo es fijo e
     * indiferente al precio de los productos que lo componen (ver Combo::precio).
     * $cantidad no afecta el precio unitario, solo lo recibe el caller para el
     * subtotal, igual que calcularPrecio().
     */
    public function calcularPrecioCombo(Combo $combo, int $cantidad): ComboPriceResult
    {
        $precioLista = round((float) $combo->precio, 2);
        $precioFinal = $precioLista;
        $descuentoAplicado = false;

        if ($combo->descuentoVigente()) {
            $valor = (float) $combo->valor_descuento;

            $precio = match ($combo->tipo_descuento) {
                TipoDescuento::Porcentaje => $precioLista * (1 - $valor / 100),
                TipoDescuento::Fijo => $precioLista - $valor,
            };

            $precioFinal = round(max(0.0, $precio), 2);
            $descuentoAplicado = true;
        }

        $ahorroUnitario = round(max(0, $precioLista - $precioFinal), 2);
        $ahorroPorcentaje = $precioLista > 0
            ? round(($ahorroUnitario / $precioLista) * 100, 2)
            : 0.0;

        return new ComboPriceResult(
            precio_lista: $precioLista,
            precio_unitario_final: $precioFinal,
            descuento_aplicado: $descuentoAplicado,
            ahorro_unitario: $ahorroUnitario,
            ahorro_porcentaje: $ahorroPorcentaje,
        );
    }
}
