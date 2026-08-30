/**
 * Umbral de "stock bajo": informativo (avisa al usuario/admin), no bloquea nada.
 * Debe mantenerse en sync con el mismo valor usado en el admin
 * (resources/js/Pages/Admin/Productos/Index.jsx) y en el catálogo público — de ahí
 * que viva acá, en un solo lugar que ambos importan, en vez de repetirse.
 */
export const UMBRAL_STOCK_BAJO = 3;

/**
 * Busca la variante seleccionada dentro de `producto.variantes`. `null` si no se
 * pasó varianteId o no matchea ninguna — en ese caso todas las funciones de este
 * archivo caen al comportamiento de siempre (stock del producto), sin cambios.
 */
function resolverVariante(producto, varianteId) {
    if (varianteId === null || varianteId === undefined) return null;

    return (producto.variantes || []).find((v) => v.id === varianteId) || null;
}

/**
 * Resuelve la "entidad de stock" relevante: la variante seleccionada si se pasó
 * varianteId y matchea, o el producto en cualquier otro caso (sin varianteId, o
 * producto sin esa variante). Toda función de este archivo que reciba varianteId
 * lo hace opcional y delega acá — un producto sin variantes sigue funcionando
 * exactamente igual que antes porque varianteId nunca resuelve a nada.
 */
function resolverEntidadStock(producto, varianteId) {
    return resolverVariante(producto, varianteId) ?? producto;
}

/** `null` = stock ilimitado, nunca hay que capear ni avisar nada. */
export function tieneStockIlimitado(producto, varianteId = null) {
    const entidad = resolverEntidadStock(producto, varianteId);
    return entidad.stock === null || entidad.stock === undefined;
}

export function tieneStockBajo(producto, varianteId = null) {
    const entidad = resolverEntidadStock(producto, varianteId);
    return !tieneStockIlimitado(producto, varianteId) && entidad.stock > 0 && entidad.stock <= UMBRAL_STOCK_BAJO;
}

export function sinStock(producto, varianteId = null) {
    const entidad = resolverEntidadStock(producto, varianteId);
    return !tieneStockIlimitado(producto, varianteId) && entidad.stock <= 0;
}

/**
 * Cantidad máxima seleccionable; `null` = sin límite. Si se pasa `varianteId` y
 * el producto tiene esa variante cargada, usa el stock de la variante en vez del
 * stock del producto — mismo criterio que Producto::tieneStockDisponible en el
 * backend (una vez que hay variantes, el stock del producto queda obsoleto).
 */
export function cantidadMaxima(producto, varianteId = null) {
    const entidad = resolverEntidadStock(producto, varianteId);
    return tieneStockIlimitado(producto, varianteId) ? null : Math.max(0, entidad.stock);
}

/** Capea `cantidad` al stock disponible (no-op si es ilimitado). */
export function capearCantidad(producto, cantidad, varianteId = null) {
    const max = cantidadMaxima(producto, varianteId);
    return max === null ? cantidad : Math.min(cantidad, max);
}

/**
 * Suma del stock de todas las variantes activas del producto; `null` (sin tope) si
 * alguna es ilimitada o el producto no tiene variantes. Es el tope de cantidad
 * cuando el cliente puede repartir esa cantidad entre varios colores en la ficha
 * (ver RepartoVariantes) — el stock de un color individual ya no es el límite.
 */
export function cantidadMaximaTotalVariantes(producto) {
    const activas = (producto.variantes || []).filter((v) => v.is_active !== false);
    if (activas.length === 0) return cantidadMaxima(producto);
    if (activas.some((v) => v.stock === null || v.stock === undefined)) return null;
    return activas.reduce((suma, v) => suma + Math.max(0, v.stock), 0);
}
