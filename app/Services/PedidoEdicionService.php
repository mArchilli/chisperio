<?php

namespace App\Services;

use App\Enums\EstadoPedido;
use App\Enums\TipoDescuento;
use App\Exceptions\StockInsuficienteException;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Edición de un pedido ya recibido por parte de admin/vendedor (cambió una variante,
 * una cantidad o el monto final). A diferencia del checkout, acá el precio unitario
 * lo fija a mano quien edita: no se recalcula por escala/oferta/variante, porque el
 * objetivo justamente es reflejar lo que se acordó con el cliente. Lo que sí se
 * recalcula, desde los snapshots del pedido, es todo lo derivado: subtotal,
 * descuento del código, recargo de tarjeta, total y envío gratis. El stock se ajusta
 * solo por la diferencia.
 */
class PedidoEdicionService
{
    private const CAMPOS_CLIENTE = [
        'cliente_nombre',
        'cliente_dni',
        'cliente_telefono',
        'cliente_email',
        'cliente_provincia',
        'cliente_ciudad',
        'cliente_codigo_postal',
        'observaciones',
    ];

    public function __construct(
        private readonly StockService $stockService,
        private readonly CodigoDescuentoService $codigoDescuentoService,
        private readonly RecargoPagoService $recargoPagoService,
    ) {}

    /**
     * @param  array<string, mixed>  $datos  Ya validado por PedidoController::actualizar.
     *
     * @throws ValidationException
     */
    public function actualizar(Pedido $pedido, array $datos): Pedido
    {
        try {
            return DB::transaction(function () use ($pedido, $datos) {
                // Lock del pedido: una edición no debe pisarse con otra edición ni con un
                // cambio de estado (ej. cancelar) que corra al mismo tiempo.
                $pedido = Pedido::whereKey($pedido->id)->lockForUpdate()->firstOrFail();

                if ($pedido->estado !== EstadoPedido::Pendiente) {
                    throw ValidationException::withMessages([
                        'estado' => $pedido->estado === EstadoPedido::Cancelado
                            ? 'Un pedido cancelado no se puede editar.'
                            : 'Un pedido despachado no se puede editar. Primero volvelo a pendiente.',
                    ]);
                }

                $operacionesAntes = $this->stockService->operacionesDe($pedido);

                $this->aplicarItems($pedido, $datos['items']);
                $this->recalcularTotales($pedido);

                $pedido->fill(Arr::only($datos, self::CAMPOS_CLIENTE));
                $pedido->editado_at = now();
                $pedido->save();

                $this->stockService->ajustarPorEdicion(
                    $pedido,
                    $operacionesAntes,
                    $this->stockService->operacionesDe($pedido)
                );

                return $pedido;
            });
        } catch (StockInsuficienteException $e) {
            $titulo = Producto::find($e->productoId)?->titulo ?? 'este producto';

            throw ValidationException::withMessages([
                'items' => $e->stockDisponible > 0
                    ? "Solo quedan {$e->stockDisponible} unidades de {$titulo} para sumar al pedido (la edición necesita {$e->cantidadSolicitada} más)."
                    : "No queda stock de {$titulo} para sumar al pedido.",
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $itemsInput
     */
    private function aplicarItems(Pedido $pedido, array $itemsInput): void
    {
        $items = $pedido->items()->get()->keyBy('id');
        $idsEnviados = collect($itemsInput)->pluck('id')->map(fn ($id) => (int) $id);

        if ($idsEnviados->diff($items->keys())->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => 'Alguno de los items no pertenece a este pedido.',
            ]);
        }

        // Lo que no vino en el request es una línea quitada del pedido.
        $items->reject(fn (PedidoItem $item) => $idsEnviados->contains($item->id))
            ->each(fn (PedidoItem $item) => $item->delete());

        foreach ($itemsInput as $indice => $input) {
            $item = $items->get((int) $input['id']);

            $cambios = $item->combo_id !== null
                ? $this->cambiosDeCombo($item, $input, $indice)
                : $this->cambiosDeProducto($item, $input, $indice);

            $cantidad = (int) $input['cantidad'];
            $precio = round((float) $input['precio_unitario'], 2);

            $item->update([
                ...$cambios,
                'cantidad' => $cantidad,
                'precio_unitario' => $precio,
                'subtotal' => round($precio * $cantidad, 2),
            ]);
        }
    }

    /**
     * Variante (obligatoria si el producto tiene variantes activas), color solicitado
     * (solo si la variante es "Otro / a elección del cliente") y texto de los add-ons
     * que lo requieren. No se agregan ni quitan add-ons: eso cambia el precio de
     * catálogo, y el precio ya se edita directo.
     *
     * @return array<string, mixed>
     */
    private function cambiosDeProducto(PedidoItem $item, array $input, int $indice): array
    {
        $cambios = [];
        $varianteId = isset($input['variante_id']) ? (int) $input['variante_id'] : null;
        $varianteActual = $item->producto_variante_id !== null ? (int) $item->producto_variante_id : null;

        // Producto borrado del catálogo: no hay de dónde elegir variante, se deja la que estaba.
        if ($item->producto_id !== null && $varianteId !== $varianteActual) {
            if ($varianteId === null) {
                if (ProductoVariante::where('producto_id', $item->producto_id)->activas()->exists()) {
                    throw ValidationException::withMessages([
                        "items.{$indice}.variante_id" => "Elegí un color para \"{$item->titulo}\".",
                    ]);
                }

                $cambios += [
                    'producto_variante_id' => null,
                    'variante_nombre' => null,
                    'variante_color_hex' => null,
                    'recargo_variante_unitario' => null,
                ];
            } else {
                $variante = $this->resolverVariante($item->producto_id, $varianteId, "items.{$indice}.variante_id");

                $cambios += [
                    'producto_variante_id' => $variante->id,
                    'variante_nombre' => $variante->nombre,
                    'variante_color_hex' => $variante->color_hex,
                    'recargo_variante_unitario' => round((float) $variante->precio_adicional, 2),
                ];
            }

            $varianteActual = $varianteId;
        }

        $esPersonalizada = $varianteActual !== null
            && ProductoVariante::whereKey($varianteActual)->value('es_color_personalizado');

        if ($esPersonalizada) {
            $texto = trim((string) ($input['color_personalizado_texto'] ?? ''));

            if ($texto === '') {
                throw ValidationException::withMessages([
                    "items.{$indice}.color_personalizado_texto" => 'Indicá el color o una descripción de lo que necesita el cliente.',
                ]);
            }

            $cambios['color_personalizado_texto'] = $texto;
        } else {
            $cambios['color_personalizado_texto'] = null;
        }

        if (is_array($item->addons_seleccionados)) {
            $addons = $item->addons_seleccionados;

            foreach ($addons as $posicion => $addon) {
                if (($addon['texto_personalizado'] ?? null) === null) {
                    continue;
                }

                $texto = trim((string) ($input['addons_textos'][$posicion] ?? ''));

                if ($texto === '') {
                    throw ValidationException::withMessages([
                        "items.{$indice}.addons_textos.{$posicion}" => "El add-on \"{$addon['nombre']}\" requiere un texto de personalización.",
                    ]);
                }

                $addons[$posicion]['texto_personalizado'] = $texto;
            }

            $cambios['addons_seleccionados'] = $addons;
        }

        return $cambios;
    }

    /**
     * Variante de cada componente del combo (snapshot en combo_items_seleccionados) y
     * recálculo de cantidad_total según la nueva cantidad de combos.
     *
     * @return array<string, mixed>
     */
    private function cambiosDeCombo(PedidoItem $item, array $input, int $indice): array
    {
        $cantidadCombos = (int) $input['cantidad'];
        $componentes = $item->combo_items_seleccionados ?? [];

        foreach ($componentes as $posicion => $componente) {
            $varianteId = isset($input['componentes_variantes'][$posicion])
                ? (int) $input['componentes_variantes'][$posicion]
                : null;
            $varianteActual = ($componente['producto_variante_id'] ?? null) !== null
                ? (int) $componente['producto_variante_id']
                : null;

            if ($varianteId !== $varianteActual) {
                $campo = "items.{$indice}.componentes_variantes.{$posicion}";

                if ($varianteId === null) {
                    if (ProductoVariante::where('producto_id', $componente['producto_id'])->activas()->exists()) {
                        throw ValidationException::withMessages([
                            $campo => "Elegí un color para \"{$componente['titulo']}\".",
                        ]);
                    }

                    $componente['producto_variante_id'] = null;
                    $componente['variante_nombre'] = null;
                    $componente['variante_color_hex'] = null;
                } else {
                    $variante = $this->resolverVariante((int) $componente['producto_id'], $varianteId, $campo);

                    $componente['producto_variante_id'] = $variante->id;
                    $componente['variante_nombre'] = $variante->nombre;
                    $componente['variante_color_hex'] = $variante->color_hex;
                }
            }

            $componente['cantidad_total'] = (int) $componente['cantidad_por_combo'] * $cantidadCombos;
            $componentes[$posicion] = $componente;
        }

        return ['combo_items_seleccionados' => $componentes];
    }

    private function resolverVariante(int $productoId, int $varianteId, string $campo): ProductoVariante
    {
        $variante = ProductoVariante::where('producto_id', $productoId)->activas()->find($varianteId);

        if ($variante === null) {
            throw ValidationException::withMessages([
                $campo => 'La variante elegida no existe, no está activa o no pertenece a este producto.',
            ]);
        }

        return $variante;
    }

    /**
     * Subtotal desde los items, y de ahí todo lo derivado a partir de los SNAPSHOTS del
     * pedido (tipo/valor del descuento, porcentaje/cuotas del recargo, monto mínimo de
     * envío gratis), no de los valores actuales de esas configuraciones.
     */
    private function recalcularTotales(Pedido $pedido): void
    {
        $subtotal = round((float) $pedido->items()->sum('subtotal'), 2);

        $descuento = (float) $pedido->descuento_monto;

        if ($pedido->codigo_descuento_texto !== null && $pedido->codigo_descuento_tipo !== null && $pedido->codigo_descuento_valor !== null) {
            $descuento = $this->codigoDescuentoService->calcularMontoDesdeSnapshot(
                $pedido->codigo_descuento_tipo,
                (float) $pedido->codigo_descuento_valor,
                $subtotal
            );
        }

        $total = round(max(0.0, $subtotal - $descuento), 2);

        $pedido->subtotal = $subtotal;
        $pedido->descuento_monto = $descuento;
        $pedido->total = $total;

        if ($pedido->plan_pago_tarjeta_id !== null && $pedido->recargo_porcentaje !== null) {
            $recargo = $this->recargoPagoService->calcularDesdePorcentaje(
                $total,
                (float) $pedido->recargo_porcentaje,
                (int) $pedido->plan_pago_cuotas
            );

            $pedido->recargo_monto = $recargo['recargo_monto'];
            $pedido->total_con_recargo = $recargo['total_con_recargo'];
        }

        // Envío gratis = superar el monto (snapshot) O llevar únicamente combos con envío gratis
        // propio (la línea guarda su flag). Quitar o dejar solo líneas cambia la segunda condición.
        $items = $pedido->items()->get();
        $soloCombosConEnvioGratis = $items->isNotEmpty()
            && $items->every(fn (PedidoItem $item) => $item->combo_id !== null && $item->envio_gratis);

        // Pedidos anteriores a la columna (monto mínimo null) no tienen con qué comparar el monto:
        // solo se marca si cumple por combo, y nunca se desmarca.
        if ($pedido->envio_gratis_monto_minimo !== null) {
            $porMonto = (float) $pedido->envio_gratis_monto_minimo > 0
                && $subtotal >= (float) $pedido->envio_gratis_monto_minimo;
            $pedido->envio_gratis = $porMonto || $soloCombosConEnvioGratis;
        } elseif ($soloCombosConEnvioGratis) {
            $pedido->envio_gratis = true;
        }
    }
}
