<?php

namespace App\Services;

use App\Enums\EstadoPedido;
use App\Enums\TipoDescuento;
use App\Exceptions\StockInsuficienteException;
use App\Exceptions\VarianteRequeridaException;
use App\Models\Addon;
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
        private readonly PricingService $pricingService,
        private readonly ComboPedidoResolver $comboResolver,
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

                if (! $pedido->estado->esEditable()) {
                    throw ValidationException::withMessages([
                        'estado' => 'Un pedido cancelado no se puede editar.',
                    ]);
                }

                $operacionesAntes = $this->stockService->operacionesDe($pedido);

                $this->aplicarItems($pedido, $datos['items'] ?? []);
                $this->agregarItems($pedido, $datos['nuevos_items'] ?? []);

                if (! $pedido->items()->exists()) {
                    throw ValidationException::withMessages([
                        'items' => 'El pedido necesita al menos un producto.',
                    ]);
                }

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
     * Suma al pedido las líneas nuevas (productos sueltos o combos) que cargó quien edita,
     * por ejemplo algo que el cliente pidió después de hacer el pedido en la web. El stock
     * lo ajusta ajustarPorEdicion() por la diferencia, igual que el resto de la edición.
     *
     * @param  array<int, array<string, mixed>>  $nuevos
     */
    private function agregarItems(Pedido $pedido, array $nuevos): void
    {
        foreach ($nuevos as $indice => $input) {
            $datos = ($input['tipo'] ?? 'producto') === 'combo'
                ? $this->nuevoItemCombo($input, $indice)
                : $this->nuevoItemProducto($input, $indice);

            $pedido->items()->create($datos);
        }
    }

    /**
     * Línea de producto nueva. Variante y add-ons se validan contra el catálogo real (misma
     * regla que el checkout: con variantes activas el color es obligatorio) y el precio de
     * catálogo queda en los snapshots; el precio unitario es el que mande quien edita y, si
     * no manda ninguno, el que calcula el catálogo para esa cantidad.
     *
     * @return array<string, mixed>
     */
    private function nuevoItemProducto(array $input, int $indice): array
    {
        $producto = Producto::with(['escalasPrecio', 'ofertaVigente'])->find($input['producto_id'] ?? null);

        if ($producto === null || ! $producto->is_active) {
            throw ValidationException::withMessages([
                'nuevos_items' => 'Uno de los productos que querés sumar ya no está disponible.',
            ]);
        }

        $cantidad = (int) $input['cantidad'];
        $varianteId = isset($input['variante_id']) ? (int) $input['variante_id'] : null;
        $addonsInput = collect($input['addons'] ?? []);

        try {
            $precio = $this->pricingService->calcularPrecio(
                $producto,
                $cantidad,
                $varianteId,
                $addonsInput->pluck('addon_id')->map(fn ($id) => (int) $id)->all(),
                exigirVariante: true
            );
        } catch (VarianteRequeridaException) {
            throw ValidationException::withMessages([
                'nuevos_items' => "Elegí un color para \"{$producto->titulo}\".",
            ]);
        } catch (ValidationException $e) {
            throw ValidationException::withMessages([
                'nuevos_items' => "{$producto->titulo}: ".collect($e->errors())->flatten()->first(),
            ]);
        }

        $addonsSeleccionados = collect($precio->addons_aplicados)
            ->map(function (Addon $addon) use ($addonsInput, $producto) {
                $texto = $addon->requiere_texto
                    ? trim((string) ($addonsInput->firstWhere('addon_id', $addon->id)['texto_personalizado'] ?? ''))
                    : null;

                if ($addon->requiere_texto && $texto === '') {
                    throw ValidationException::withMessages([
                        'nuevos_items' => "El add-on \"{$addon->nombre}\" de {$producto->titulo} requiere un texto de personalización.",
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

        $colorPersonalizado = null;

        if ($precio->variante_aplicada?->esPersonalizada()) {
            $colorPersonalizado = trim((string) ($input['color_personalizado_texto'] ?? ''));

            if ($colorPersonalizado === '') {
                throw ValidationException::withMessages([
                    'nuevos_items' => "Indicá el color o una descripción para \"{$precio->variante_aplicada->nombre}\" en {$producto->titulo}.",
                ]);
            }
        }

        $precioUnitario = round((float) ($input['precio_unitario'] ?? $precio->precio_final_con_opciones), 2);

        return [
            'producto_id' => $producto->id,
            'producto_variante_id' => $precio->variante_aplicada?->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => $precioUnitario,
            'cantidad' => $cantidad,
            'subtotal' => round($precioUnitario * $cantidad, 2),
            'variante_nombre' => $precio->variante_aplicada?->nombre,
            'variante_color_hex' => $precio->variante_aplicada?->color_hex,
            'recargo_variante_unitario' => $precio->recargo_variante,
            'addons_seleccionados' => $addonsSeleccionados !== [] ? $addonsSeleccionados : null,
            'addons_total_unitario' => $precio->addons_total,
            'precio_base_unitario' => $precio->precio_unitario_final,
            'color_personalizado_texto' => $colorPersonalizado,
        ];
    }

    /**
     * Línea de combo nueva: el snapshot de componentes lo arma el mismo resolver que usa el
     * checkout (variante fija o elegida, validada contra el catálogo).
     *
     * @return array<string, mixed>
     */
    private function nuevoItemCombo(array $input, int $indice): array
    {
        try {
            $resuelto = $this->comboResolver->resolverLinea([
                'combo_id' => $input['combo_id'] ?? null,
                'cantidad' => $input['cantidad'],
                'selecciones' => $input['selecciones'] ?? [],
            ]);
        } catch (ValidationException $e) {
            throw ValidationException::withMessages([
                'nuevos_items' => collect($e->errors())->flatten()->first(),
            ]);
        }

        $combo = $resuelto['combo'];
        $cantidad = $resuelto['cantidad'];
        $precio = $this->pricingService->calcularPrecioCombo($combo, $cantidad);
        $precioUnitario = round((float) ($input['precio_unitario'] ?? $precio->precio_unitario_final), 2);

        return [
            'combo_id' => $combo->id,
            'combo_items_seleccionados' => $resuelto['componentes'],
            'titulo' => $combo->titulo,
            'precio_unitario' => $precioUnitario,
            'cantidad' => $cantidad,
            'subtotal' => round($precioUnitario * $cantidad, 2),
            'precio_base_unitario' => $precio->precio_lista,
            'envio_gratis' => (bool) $combo->envio_gratis,
        ];
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
