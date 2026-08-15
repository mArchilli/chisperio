/**
 * Umbral de "stock bajo": informativo (avisa al usuario/admin), no bloquea nada.
 * Debe mantenerse en sync con el mismo valor usado en el admin
 * (resources/js/Pages/Admin/Productos/Index.jsx) y en el catálogo público — de ahí
 * que viva acá, en un solo lugar que ambos importan, en vez de repetirse.
 */
export const UMBRAL_STOCK_BAJO = 3;

/** `null` = stock ilimitado, nunca hay que capear ni avisar nada. */
export function tieneStockIlimitado(producto) {
    return producto.stock === null || producto.stock === undefined;
}

export function tieneStockBajo(producto) {
    return !tieneStockIlimitado(producto) && producto.stock > 0 && producto.stock <= UMBRAL_STOCK_BAJO;
}

export function sinStock(producto) {
    return !tieneStockIlimitado(producto) && producto.stock <= 0;
}

/** Cantidad máxima seleccionable para este producto; `null` = sin límite. */
export function cantidadMaxima(producto) {
    return tieneStockIlimitado(producto) ? null : Math.max(0, producto.stock);
}

/** Capea `cantidad` al stock disponible del producto (no-op si es ilimitado). */
export function capearCantidad(producto, cantidad) {
    const max = cantidadMaxima(producto);
    return max === null ? cantidad : Math.min(cantidad, max);
}
