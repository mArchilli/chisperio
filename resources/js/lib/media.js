/**
 * Espeja en cliente Producto::mediaParaVariante (backend) para poder resolver qué
 * imágenes/video mostrar en la ficha apenas el cliente elige un color, sin ida y
 * vuelta al servidor. `imagenes`/`videos` son los arrays completos del producto
 * (cada item ya trae `producto_variante_id`, nullable = medio general) tal como
 * los manda TiendaController::show vía Inertia.
 */
export function resolverMediaParaVariante(imagenes, videos, varianteId) {
    if (varianteId === null || varianteId === undefined) {
        return {
            imagenes: (imagenes || []).filter((m) => m.producto_variante_id == null),
            video: (videos || []).find((m) => m.producto_variante_id == null) ?? null,
        };
    }

    const imagenesVariante = (imagenes || []).filter((m) => m.producto_variante_id === varianteId);
    const videoVariante = (videos || []).find((m) => m.producto_variante_id === varianteId) ?? null;

    return {
        imagenes: imagenesVariante.length > 0
            ? imagenesVariante
            : (imagenes || []).filter((m) => m.producto_variante_id == null),
        video: videoVariante ?? (videos || []).find((m) => m.producto_variante_id == null) ?? null,
    };
}
