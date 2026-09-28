/**
 * Espejo en cliente de App\Models\Combo::stockDisponible() / ComboProducto::stockDisponibleUnidad().
 * Un combo no tiene stock propio: se deriva del stock de los productos que lo
 * componen. `combo.items[i]` viene con `producto` (con `variantes_activas` activas
 * cargadas) y `producto_variante` (la fijada por el admin, si hay) — mismo shape que
 * arma TiendaController::showCombo.
 *
 * `seleccionPorItem` es un mapa { [comboItemId]: varianteId } con la variante que el
 * comprador eligió para los items que lo requieren (ComboProducto::requiereSeleccionVariante).
 * Sin selección todavía (p. ej. la card de la vidriera) se usa el criterio conservador
 * de sumar el stock de todas las variantes activas de ese item.
 */
function stockDisponibleUnidadItem(item, varianteIdSeleccionada = null) {
    if (item.producto?.is_active === false) return 0;

    if (item.producto_variante_id) {
        const variante = item.producto_variante;
        if (!variante) return 0;
        return variante.stock === null || variante.stock === undefined ? null : Math.max(0, variante.stock);
    }

    const variantesActivas = item.producto?.variantes_activas || [];

    if (variantesActivas.length === 0) {
        const stock = item.producto?.stock;
        return stock === null || stock === undefined ? null : Math.max(0, stock);
    }

    if (varianteIdSeleccionada !== null && varianteIdSeleccionada !== undefined) {
        const variante = variantesActivas.find((v) => v.id === varianteIdSeleccionada);
        if (variante) {
            return variante.stock === null || variante.stock === undefined ? null : Math.max(0, variante.stock);
        }
    }

    if (variantesActivas.some((v) => v.stock === null || v.stock === undefined)) return null;

    return variantesActivas.reduce((suma, v) => suma + Math.max(0, v.stock), 0);
}

/**
 * Cuántos combos completos se pueden armar hoy: el mínimo, entre todos los items,
 * de "stock disponible de ese item / cantidad de receta". `null` = ilimitado, solo
 * si TODOS los items lo son. Espeja Combo::stockDisponible().
 */
export function stockDisponibleCombo(combo, seleccionPorItem = {}) {
    let maxCombos = null;

    for (const item of combo.items || []) {
        const stockItem = stockDisponibleUnidadItem(item, seleccionPorItem[item.id] ?? null);
        if (stockItem === null) continue;

        const maxParaEsteItem = Math.floor(stockItem / Math.max(1, item.cantidad));
        maxCombos = maxCombos === null ? maxParaEsteItem : Math.min(maxCombos, maxParaEsteItem);
    }

    return maxCombos;
}

export function sinStockCombo(combo, seleccionPorItem = {}) {
    const stock = stockDisponibleCombo(combo, seleccionPorItem);
    return stock !== null && stock <= 0;
}

/**
 * Arma la lista de "incluye" de una línea de combo del carrito, cruzando el
 * snapshot de items del combo (`item.combo.items`, con la variante fija si la hay)
 * con las selecciones que hizo el comprador (`item.selecciones`, ver ShowCombo.jsx).
 * La usan Carrito.jsx (para mostrar la línea) y Checkout.jsx (para el mensaje de
 * WhatsApp — ver whatsapp.js).
 */
export function itemsIncluidosCombo(item) {
    const seleccionPorItemId = {};
    (item.selecciones || []).forEach((s) => {
        seleccionPorItemId[s.comboItemId] = s;
    });

    return (item.combo?.items || []).map((comboItem) => {
        const pinned = comboItem.producto_variante;
        const elegida = seleccionPorItemId[comboItem.id];

        return {
            id: comboItem.id,
            titulo: comboItem.producto?.titulo,
            cantidad: comboItem.cantidad,
            varianteNombre: pinned?.nombre ?? elegida?.varianteNombre ?? null,
            varianteColorHex: pinned?.color_hex ?? elegida?.varianteColorHex ?? null,
        };
    });
}
