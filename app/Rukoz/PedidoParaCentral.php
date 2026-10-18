<?php

namespace App\Rukoz;

use App\Models\Combo;
use App\Models\Pedido;
use App\Models\PedidoItem;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Arma el body de `POST /pedidos` / `PUT /pedidos/{ref}` del Central a partir de un pedido de la web (guardado o
 * todavía en memoria: el checkout lo arma ANTES de reservar, con modelos sin guardar).
 *
 * El pedido se arma SIEMPRE desde el estado de la web, tanto al crear como al editar o al revertir una edición: es la
 * única fuente y el Central recibe lo que la web tiene guardado.
 *
 *  - Líneas: un producto/variante vinculado va como `tipo:id` (con variantes activas, siempre la variante); el
 *    `precio_unitario` es el FINAL por unidad (escalas, ofertas, recargo de la variante y add-ons) y NO incluye el cupón.
 *  - Cupón: no se reparte entre las líneas. `total` = suma de las líneas − descuento; el Central toma esa diferencia
 *    como descuento al confirmar (API.md, «El descuento no se manda dos veces»).
 *  - Combo fijo → el combo, sin selecciones. Combo con elección (o mixto) → `selecciones`, un grupo por línea de la receta,
 *    con el nombre que informó el catálogo (`CatalogoDeChisperio::nombreDeGrupo`).
 *  - `nota` por línea (hasta 500 caracteres): el color a elección y el texto de cada add-on. Puede llevar un nombre: no se
 *    loguea en ningún lado.
 *  - Envío: no es una línea (el Central solo admite producto/variante/combo) ni suma al `total`; el costo se informa al
 *    confirmar. Que el pedido califica para envío gratis y la sucursal con la que coordina el cliente (la API no tiene campo
 *    para ninguna) viajan al principio de `cliente.observaciones`.
 *  - Los productos «con variantes» (`no_aplica` en el Central) nunca viajan como línea: lo que se compra es una variante.
 */
final class PedidoParaCentral
{
    private const MAX_NOTA = 500;

    /**
     * @param  iterable<PedidoItem>  $items
     */
    public function armar(Pedido $pedido, iterable $items, CarbonInterface $creadoAt): PedidoArmado
    {
        $lineas = [];
        $etiquetas = [];

        foreach ($items as $item) {
            [$linea, $etiqueta] = $item->combo_id !== null || $this->esComboHuerfano($item)
                ? $this->lineaDeCombo($item)
                : $this->lineaDeProducto($item);

            $lineas[] = $linea;
            $etiquetas[] = $etiqueta;
        }

        $payload = [
            'cliente' => $this->cliente($pedido),
            'items' => $lineas,
            'total' => (float) $pedido->total,
            'moneda' => 'ARS',
            'creado_at' => $creadoAt->toIso8601String(),
        ];

        if ($pedido->total_con_recargo !== null) {
            $payload['total_con_recargo'] = (float) $pedido->total_con_recargo;
        }

        return new PedidoArmado($payload, $etiquetas);
    }

    /**
     * La nota de una línea de producto: «Color: Turquesa · Grabado: Para Ana». `null` si no hay nada que decir.
     */
    public static function notaDe(PedidoItem $item): ?string
    {
        $partes = [];

        $color = trim((string) $item->color_personalizado_texto);

        if ($color !== '') {
            $partes[] = 'Color: '.$color;
        }

        foreach ((array) $item->addons_seleccionados as $addon) {
            $texto = trim((string) ($addon['texto_personalizado'] ?? ''));

            if ($texto !== '') {
                $partes[] = trim((string) ($addon['nombre'] ?? 'Personalización')).': '.$texto;
            }
        }

        $nota = implode(' · ', $partes);

        return $nota === '' ? null : mb_substr($nota, 0, self::MAX_NOTA);
    }

    /**
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function lineaDeProducto(PedidoItem $item): array
    {
        if ($item->producto_id === null && $item->producto_variante_id === null) {
            throw ValidationException::withMessages([
                'items' => "\"{$item->titulo}\" ya no existe en el catálogo: quitalo del pedido para poder guardarlo.",
            ]);
        }

        $conVariante = $item->producto_variante_id !== null;
        $nombre = $item->titulo.($conVariante && $item->variante_nombre ? ' ('.$item->variante_nombre.')' : '');

        $linea = [
            'tipo' => $conVariante ? 'variante' : 'producto',
            'id' => (string) ($conVariante ? $item->producto_variante_id : $item->producto_id),
            'nombre' => Str::limit($nombre, 255, ''),
            'cantidad' => (int) $item->cantidad,
            'precio_unitario' => (float) $item->precio_unitario,
        ];

        if (($nota = self::notaDe($item)) !== null) {
            $linea['nota'] = $nota;
        }

        return [$linea, [
            'titulo' => $item->titulo,
            'variante' => $conVariante ? $item->variante_nombre : null,
            'producto_id' => $item->producto_id,
            'combo_id' => null,
            'cantidad' => (int) $item->cantidad,
            'stock' => [[$linea['tipo'], $linea['id']]],
        ]];
    }

    /**
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function lineaDeCombo(PedidoItem $item): array
    {
        $combo = $item->combo_id === null
            ? null
            : Combo::with(['items.producto.variantesActivas'])->find($item->combo_id);

        if ($combo === null) {
            throw ValidationException::withMessages([
                'items' => "El combo \"{$item->titulo}\" ya no existe en el catálogo: quitalo del pedido para poder guardarlo.",
            ]);
        }

        $linea = [
            'tipo' => 'combo',
            'id' => (string) $combo->id,
            'nombre' => Str::limit($combo->titulo, 255, ''),
            'cantidad' => (int) $item->cantidad,
            'precio_unitario' => (float) $item->precio_unitario,
        ];

        // Misma regla que el catálogo (CatalogoDeChisperio::combos): con alguna línea de elección el combo es de
        // `seleccion` y hay que decir qué se eligió; si no, es `fijo` y el Central lo resuelve solo.
        if ($combo->items->contains(fn ($receta) => $receta->requiereSeleccionVariante())) {
            $linea['selecciones'] = $this->seleccionesDe($combo, $item);
        }

        return [$linea, [
            'titulo' => $item->titulo,
            'variante' => null,
            'producto_id' => null,
            'combo_id' => $combo->id,
            'cantidad' => (int) $item->cantidad,
            // El combo y cada componente elegido: lo que hay que releer del Central si no alcanza el stock.
            'stock' => [
                ['combo', (string) $combo->id],
                ...collect($item->combo_items_seleccionados ?? [])
                    ->map(fn ($c) => ! empty($c['producto_variante_id'])
                        ? ['variante', (string) $c['producto_variante_id']]
                        : ['producto', (string) $c['producto_id']])
                    ->all(),
            ],
        ]];
    }

    /**
     * Un grupo por línea de la receta, con lo que quedó guardado en el snapshot del pedido (`combo_producto_id`).
     *
     * @return list<array{grupo: string, opciones: list<array{tipo: string, id: string, cantidad: int}>}>
     */
    private function seleccionesDe(Combo $combo, PedidoItem $item): array
    {
        $componentes = collect($item->combo_items_seleccionados ?? [])->keyBy(fn ($c) => $c['combo_producto_id'] ?? null);
        $selecciones = [];

        foreach ($combo->items as $receta) {
            $componente = $componentes->get($receta->id);

            if ($componente === null) {
                throw ValidationException::withMessages([
                    'items' => "El combo \"{$item->titulo}\" cambió su receta desde que se hizo el pedido: quitalo y volvelo a agregar.",
                ]);
            }

            $varianteId = $componente['producto_variante_id'] ?? null;

            $selecciones[] = [
                'grupo' => CatalogoDeChisperio::nombreDeGrupo($receta),
                'opciones' => [[
                    'tipo' => $varianteId !== null ? 'variante' : 'producto',
                    'id' => (string) ($varianteId ?? $componente['producto_id']),
                    'cantidad' => (int) $componente['cantidad_por_combo'],
                ]],
            ];
        }

        return $selecciones;
    }

    /** Un ítem con snapshot de combo pero sin `combo_id` (el combo se borró): se trata como combo inexistente. */
    private function esComboHuerfano(PedidoItem $item): bool
    {
        return $item->producto_id === null
            && $item->producto_variante_id === null
            && ! empty($item->combo_items_seleccionados);
    }

    /**
     * Los topes son los del Central (`PedidoWebRequest`): la web admite textos más largos y el Central los rechazaría.
     *
     * @return array<string, string>
     */
    private function cliente(Pedido $pedido): array
    {
        $observaciones = array_filter([
            'Sucursal: '.($pedido->sucursal?->label() ?? 'Buenos Aires'),
            $pedido->envio_gratis ? 'Envío gratis' : null,
            trim((string) $pedido->observaciones) !== '' ? trim((string) $pedido->observaciones) : null,
        ]);

        $cliente = [
            'nombre' => $this->recortar($pedido->cliente_nombre, 255),
            'telefono' => $this->recortar($pedido->cliente_telefono, 60),
            'dni' => $this->recortar($pedido->cliente_dni, 30),
            'email' => $this->recortar($pedido->cliente_email, 255),
            'localidad' => $this->recortar($pedido->cliente_ciudad, 255),
            'provincia' => $this->recortar($pedido->cliente_provincia, 100),
            'cp' => $this->recortar($pedido->cliente_codigo_postal, 10),
            'observaciones' => $this->recortar(implode("\n", $observaciones), 2000),
        ];

        return array_filter($cliente, fn ($valor) => $valor !== null && $valor !== '');
    }

    private function recortar(?string $valor, int $max): ?string
    {
        $valor = trim((string) $valor);

        return $valor === '' ? null : mb_substr($valor, 0, $max);
    }
}
