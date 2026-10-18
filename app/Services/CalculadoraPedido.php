<?php

namespace App\Services;

use App\DataTransferObjects\CalculoPedido;
use App\Models\Addon;
use App\Models\ConfiguracionEnvio;
use App\Models\PlanPagoTarjeta;
use App\Models\Producto;
use Illuminate\Validation\ValidationException;

/**
 * Calcula un pedido del checkout (precios, escalas, ofertas, variantes, add-ons, combos,
 * cupón, recargo de tarjeta, envío gratis y totales) a partir del request ya validado.
 *
 * NO ESCRIBE en la base: no crea el pedido ni los ítems, no descuenta stock y no consume
 * el cupón (solo lo valida y calcula cuánto descontaría). Lo único que puede hacer en la
 * base es el `lockForUpdate` de lectura sobre el cupón, y solo si el caller lo pide con
 * $bloquearCupon (tiene que estar dentro de una transacción). Eso permite usarlo tanto
 * dentro de la transacción del checkout —con el cupón lockeado, como siempre— como fuera
 * de ella, para una previsualización sin locks.
 *
 * Lanza ValidationException (422) con los mismos mensajes y claves de siempre cuando algo
 * es inválido (variante obligatoria, add-on sin texto, color a elección sin texto, cupón
 * inválido, plan de pago inactivo, combo con elección faltante) y VarianteRequeridaException
 * como defensa en profundidad.
 */
class CalculadoraPedido
{
    public function __construct(
        private readonly PricingService $pricingService,
        private readonly CodigoDescuentoService $codigoDescuentoService,
        private readonly RecargoPagoService $recargoPagoService,
        private readonly ComboPedidoResolver $comboPedidoResolver,
    ) {
    }

    /**
     * @param  array<string, mixed>  $validated  Request del checkout ya validado: `items`, `combos`, `codigo_descuento`, `plan_pago_tarjeta_id`.
     * @param  bool  $bloquearCupon  true = el cupón se busca con lockForUpdate (requiere transacción abierta del caller).
     */
    public function calcular(array $validated, bool $bloquearCupon = false): CalculoPedido
    {
        $items = $validated['items'] ?? [];

        $productos = Producto::with(['escalasPrecio', 'ofertaVigente'])
            ->whereIn('id', collect($items)->pluck('producto_id'))
            ->get()
            ->keyBy('id');

        // Una misma compra puede traer varias líneas del mismo producto (una
        // por color elegido en el repartidor de la ficha). El precio por
        // cantidad se resuelve sobre el TOTAL de unidades de ese producto en
        // el pedido, no sobre la cantidad de cada línea suelta — ver
        // PricingService::calcularPrecio ($cantidadParaEscala).
        $cantidadPorProducto = collect($items)
            ->groupBy('producto_id')
            ->map(fn ($grupo) => (int) collect($grupo)->sum('cantidad'));

        $subtotal = 0;
        $itemsData = [];

        foreach ($items as $item) {
            $producto = $productos->get($item['producto_id']);
            $varianteId = $item['variante_id'] ?? null;
            $addonsInput = collect($item['addons'] ?? []);

            // Si el producto tiene variantes activas, elegir una no es opcional: sin
            // esto, un item que llega sin variante_id (ej. el "Agregar" rápido del
            // catálogo, que nunca pasa por el selector de color de la ficha) se
            // vendería al precio base, sin recargo, sin descontar el stock real de
            // ninguna variante y sin registrar qué color preparar. Corre ANTES de
            // calcularPrecio() a propósito: un item inválido no debe llegar a tocar
            // precio ni stock. No distingue es_color_personalizado de una variante
            // fija — cualquier variante activa configurada es obligatoria.
            if ($varianteId === null && $producto->variantesActivas()->exists()) {
                throw ValidationException::withMessages([
                    'variante_id' => "Elegí un color para \"{$producto->titulo}\" antes de confirmar el pedido.",
                ]);
            }

            // calcularPrecio() valida acá mismo (con 422 si corresponde) que la
            // variante y cada addon pertenezcan a este producto y estén activos —
            // ver PricingService::resolverVariante/resolverAddons. Nunca se confía
            // en nombre/precio que pudo mandar el frontend. exigirVariante: true es
            // la misma regla de arriba, como defensa en profundidad por si algún día
            // otra vía llega hasta acá sin pasar por el guard explícito.
            $priceResult = $this->pricingService->calcularPrecio(
                $producto,
                $item['cantidad'],
                $varianteId,
                $addonsInput->pluck('addon_id')->all(),
                exigirVariante: true,
                cantidadParaEscala: $cantidadPorProducto[$item['producto_id']]
            );

            $addonsSeleccionados = collect($priceResult->addons_aplicados)
                ->map(function (Addon $addon) use ($addonsInput) {
                    $texto = $addon->requiere_texto
                        ? trim((string) ($addonsInput->firstWhere('addon_id', $addon->id)['texto_personalizado'] ?? ''))
                        : null;

                    if ($addon->requiere_texto && $texto === '') {
                        throw ValidationException::withMessages([
                            'addons' => "El add-on \"{$addon->nombre}\" requiere un texto de personalización.",
                        ]);
                    }

                    return [
                        'addon_id' => $addon->id,
                        'nombre' => $addon->nombre,
                        'precio' => round((float) ($addon->pivot->precio_override ?? $addon->precio), 2),
                        'texto_personalizado' => $texto,
                    ];
                })
                ->values()
                ->all();

            // Si la variante elegida es "Otro / a elección del cliente" (ver
            // ProductoVariante::esPersonalizada), el color real pedido no vive en la
            // variante sino en este texto libre — sin él quien despache no sabe qué
            // preparar, así que se rechaza el item entero en vez de guardarlo vacío.
            $colorPersonalizadoTexto = null;

            if ($priceResult->variante_aplicada?->esPersonalizada()) {
                $colorPersonalizadoTexto = trim((string) ($item['color_personalizado_texto'] ?? ''));

                if ($colorPersonalizadoTexto === '') {
                    throw ValidationException::withMessages([
                        'color_personalizado_texto' => "Para \"{$priceResult->variante_aplicada->nombre}\" en {$producto->titulo} tenés que indicar el color o una descripción de lo que necesitás.",
                    ]);
                }
            }

            $itemSubtotal = round($priceResult->precio_final_con_opciones * $item['cantidad'], 2);
            $subtotal += $itemSubtotal;

            $itemsData[] = [
                'producto_id' => $producto->id,
                'producto_variante_id' => $priceResult->variante_aplicada?->id,
                'titulo' => $producto->titulo,
                'precio_unitario' => $priceResult->precio_final_con_opciones,
                'cantidad' => $item['cantidad'],
                'subtotal' => $itemSubtotal,
                'variante_nombre' => $priceResult->variante_aplicada?->nombre,
                'variante_color_hex' => $priceResult->variante_aplicada?->color_hex,
                'recargo_variante_unitario' => $priceResult->recargo_variante,
                'addons_seleccionados' => $addonsSeleccionados !== [] ? $addonsSeleccionados : null,
                'addons_total_unitario' => $priceResult->addons_total,
                'precio_base_unitario' => $priceResult->precio_unitario_final,
                'color_personalizado_texto' => $colorPersonalizadoTexto,
            ];
        }

        // Líneas de combo: se resuelve cada una acá (fresca, junto con el resto del
        // cálculo) en vez de reusar el chequeo optimista de stock que hace el controller
        // antes — mismo criterio que el resto: se recarga todo y no se confía en lo previo.
        foreach ($validated['combos'] ?? [] as $comboInput) {
            $resuelto = $this->comboPedidoResolver->resolverLinea($comboInput);
            $combo = $resuelto['combo'];
            $cantidadCombo = $resuelto['cantidad'];

            $precioCombo = $this->pricingService->calcularPrecioCombo($combo, $cantidadCombo);

            $comboSubtotal = round($precioCombo->precio_unitario_final * $cantidadCombo, 2);
            $subtotal += $comboSubtotal;

            $itemsData[] = [
                'combo_id' => $combo->id,
                'combo_items_seleccionados' => $resuelto['componentes'],
                'titulo' => $combo->titulo,
                'precio_unitario' => $precioCombo->precio_unitario_final,
                'cantidad' => $cantidadCombo,
                'subtotal' => $comboSubtotal,
                'precio_base_unitario' => $precioCombo->precio_lista,
                // Snapshot: el detalle del pedido no debe cambiar si después se edita el combo.
                'envio_gratis' => (bool) $combo->envio_gratis,
            ];
        }

        // Código de descuento: se resuelve ACÁ, server-side — nunca se confía en lo que
        // mandó el frontend (el carrito solo hace una previsualización de UX). Si no es
        // válido, resolverParaCheckout() lanza ValidationException y aborta el cálculo (y
        // con él la creación del pedido): no se crea el pedido sin el descuento en silencio.
        // No consume el uso del cupón; eso lo hace quien escribe el pedido.
        $datosDescuento = $this->codigoDescuentoService->resolverParaCheckout(
            $validated['codigo_descuento'] ?? null,
            $subtotal,
            bloquear: $bloquearCupon
        );

        $total = round($subtotal - $datosDescuento['descuento_monto'], 2);

        // Igual criterio que el código de descuento: el plan que manda el frontend es
        // solo una preselección de UX, nunca la fuente de verdad. Se resuelve y valida
        // acá contra el total ya recalculado server-side — nunca se calcula el recargo
        // sobre un total que mande el frontend.
        $datosPlanPago = [
            'plan_pago_tarjeta_id' => null,
            'plan_pago_nombre' => null,
            'plan_pago_cuotas' => null,
            'recargo_porcentaje' => null,
            'recargo_monto' => null,
            'total_con_recargo' => null,
        ];

        if (! empty($validated['plan_pago_tarjeta_id'])) {
            $plan = PlanPagoTarjeta::find($validated['plan_pago_tarjeta_id']);

            if ($plan === null || ! $plan->is_active) {
                throw ValidationException::withMessages([
                    'plan_pago_tarjeta_id' => 'Esta forma de pago ya no está disponible. Elegí otra o pagá en efectivo/transferencia.',
                ]);
            }

            $recargo = $this->recargoPagoService->calcular($total, $plan);

            $datosPlanPago = [
                'plan_pago_tarjeta_id' => $plan->id,
                'plan_pago_nombre' => $plan->nombre,
                'plan_pago_cuotas' => $plan->cuotas,
                'recargo_porcentaje' => $plan->recargo_porcentaje,
                'recargo_monto' => $recargo['recargo_monto'],
                'total_con_recargo' => $recargo['total_con_recargo'],
            ];
        }

        // Snapshot de envío gratis: el monto mínimo es global y puede cambiar, pero el
        // pedido tiene que seguir diciendo si calificó con el que regía al comprar.
        // Igual criterio que el front (Checkout.jsx): sobre el subtotal, antes de
        // descuento/recargo; mínimo <= 0 = feature desactivada.
        //
        // Además, un combo con envío gratis propio lo da SOLO si es lo único que se
        // compra: con cualquier otro ítem (producto suelto u otro combo sin envío
        // gratis) ese beneficio no cuenta y rige únicamente el monto. Ver
        // resources/js/lib/envioGratis.js, que espeja esta regla en el carrito.
        $montoMinimoEnvio = (float) ConfiguracionEnvio::obtener()->monto_minimo;
        $envioGratisPorCombo = $itemsData !== [] && collect($itemsData)->every(
            fn (array $item) => ! empty($item['combo_id']) && ($item['envio_gratis'] ?? false)
        );

        return new CalculoPedido(
            items: $itemsData,
            subtotal: (float) $subtotal,
            descuento: $datosDescuento,
            total: $total,
            planPago: $datosPlanPago,
            montoMinimoEnvio: $montoMinimoEnvio,
            envioGratis: ($montoMinimoEnvio > 0 && $subtotal >= $montoMinimoEnvio) || $envioGratisPorCombo,
        );
    }
}
