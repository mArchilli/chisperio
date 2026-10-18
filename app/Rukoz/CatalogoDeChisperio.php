<?php

namespace App\Rukoz;

use App\Models\Combo;
use App\Models\ComboProducto;
use App\Models\Producto;
use App\Models\ProductoVariante;
use Illuminate\Support\Str;
use Rukoz\CoreClient\Contratos\ProveedorCatalogo;

/**
 * Catálogo de Chisperío en el formato de `POST /catalogo/sync` del Central. Solo LEE.
 *
 * Qué se manda:
 *  - Producto sin variantes: un ítem `producto`. Con variantes: el producto con su lista de `variantes`
 *    (todas, activas o no, cada una con su `activo`); en el Central se vincula cada variante, no el producto.
 *  - Precio: el de LISTA (`productos.precio`, y para una variante ese precio + `precio_adicional`). Es
 *    informativo para el Central: no se mandan escalas por cantidad, ofertas ni descuentos de combo.
 *  - Stock: no viaja (el stock NULL = ilimitado se sincroniza igual; el Central decide si es «a pedido»).
 *  - La variante «a elección del cliente» (color personalizado) va como una variante más: en el Central se
 *    vincula al artículo genérico «color a elección».
 *  - Combo con todas las líneas fijas: `tipo: fijo`. Con alguna línea de elección (o mixto): `tipo: seleccion`
 *    con UN grupo por línea (ver `gruposDe`).
 *
 * `sku`: los productos no tienen SKU; las variantes lo mandan si lo tienen cargado.
 */
class CatalogoDeChisperio implements ProveedorCatalogo
{
    /** @param list<int|string>|null $ids */
    public function productos(?array $ids = null): iterable
    {
        $consulta = Producto::query()->with('variantes');

        if ($ids !== null) {
            $consulta->whereIn('id', $ids);
        }

        foreach ($consulta->lazyById(200) as $producto) {
            $item = [
                'id' => (string) $producto->id,
                'nombre' => $producto->titulo,
                'sku' => null,
                'precio' => (float) $producto->precio,
                'activo' => (bool) $producto->is_active,
            ];

            if ($producto->variantes->isNotEmpty()) {
                $item['variantes'] = $producto->variantes
                    ->map(fn (ProductoVariante $variante) => [
                        'id' => (string) $variante->id,
                        'nombre' => $variante->nombre,
                        'sku' => $this->textoOnull($variante->sku),
                        'precio' => (float) $producto->precio + (float) $variante->precio_adicional,
                        'activo' => (bool) $variante->is_active && (bool) $producto->is_active,
                    ])
                    ->values()
                    ->all();
            }

            yield $item;
        }
    }

    /** @param list<int|string>|null $ids */
    public function combos(?array $ids = null): iterable
    {
        $consulta = Combo::query()->with(['items.producto.variantesActivas', 'items.productoVariante']);

        if ($ids !== null) {
            $consulta->whereIn('id', $ids);
        }

        foreach ($consulta->lazyById(200) as $combo) {
            $item = [
                'id' => (string) $combo->id,
                'nombre' => $combo->titulo,
                'precio' => (float) $combo->precio,
                'activo' => (bool) $combo->is_active,
            ];

            if ($combo->items->contains(fn (ComboProducto $linea) => $linea->requiereSeleccionVariante())) {
                yield $item + ['tipo' => 'seleccion', 'grupos' => $this->gruposDe($combo)];
            } else {
                yield $item + ['tipo' => 'fijo', 'items' => $this->itemsFijosDe($combo)];
            }
        }
    }

    /**
     * Combo fijo: la variante fija de la línea si la tiene, si no el producto. El Central no admite el mismo
     * ítem dos veces en un combo, y en Chisperío un producto se puede repetir en dos líneas: se suman.
     *
     * @return list<array{tipo: string, id: string, cantidad: int}>
     */
    private function itemsFijosDe(Combo $combo): array
    {
        $items = [];

        foreach ($combo->items as $linea) {
            ['tipo' => $tipo, 'id' => $id] = $this->itemDeLinea($linea);
            $clave = $tipo.':'.$id;

            if (isset($items[$clave])) {
                $items[$clave]['cantidad'] += (int) $linea->cantidad;

                continue;
            }

            $items[$clave] = ['tipo' => $tipo, 'id' => $id, 'cantidad' => (int) $linea->cantidad];
        }

        return array_values($items);
    }

    /**
     * Combo con elección (o mixto): un grupo por línea de la receta, con la cantidad de la línea.
     *  - línea fija → grupo de UNA sola opción (el producto, o la variante fija);
     *  - línea de elección → grupo con todas las variantes activas del producto como opciones.
     *
     * El nombre del grupo tiene que ser único dentro del combo y estable: «{producto} (#{id de la línea})».
     * Ese id (`combo_productos.id`) también queda en el snapshot del pedido (`combo_producto_id`), así
     * el checkout arma las selecciones con el mismo nombre.
     *
     * @return list<array{nombre: string, cantidad: int, opciones: list<array{tipo: string, id: string}>}>
     */
    private function gruposDe(Combo $combo): array
    {
        $grupos = [];

        foreach ($combo->items as $linea) {
            $opciones = $linea->requiereSeleccionVariante()
                ? $linea->producto->variantesActivas
                    ->map(fn (ProductoVariante $variante) => ['tipo' => 'variante', 'id' => (string) $variante->id])
                    ->values()
                    ->all()
                : [$this->itemDeLinea($linea)];

            $grupos[] = [
                'nombre' => self::nombreDeGrupo($linea),
                'cantidad' => (int) $linea->cantidad,
                'opciones' => $opciones,
            ];
        }

        return $grupos;
    }

    /** Nombre del grupo de una línea del combo (ver `gruposDe`). */
    public static function nombreDeGrupo(ComboProducto $linea): string
    {
        return Str::limit((string) $linea->producto->titulo, 200, '').' (#'.$linea->id.')';
    }

    /** @return array{tipo: string, id: string} */
    private function itemDeLinea(ComboProducto $linea): array
    {
        return $linea->producto_variante_id !== null
            ? ['tipo' => 'variante', 'id' => (string) $linea->producto_variante_id]
            : ['tipo' => 'producto', 'id' => (string) $linea->producto_id];
    }

    private function textoOnull(?string $valor): ?string
    {
        $valor = trim((string) $valor);

        return $valor === '' ? null : $valor;
    }
}
