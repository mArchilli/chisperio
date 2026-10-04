/**
 * Helpers del Meta Pixel. El base code (fbevents.js + init + primer PageView) vive
 * en resources/views/partials/meta-pixel.blade.php; acá solo se disparan eventos
 * y se decide en qué rutas está permitido.
 *
 * Limitación conocida (a propósito, no se resuelve): si alguien entra por una ruta
 * excluida (p. ej. /login) y navega a una pública SIN recargar, el partial Blade no
 * se renderizó en esa carga y `window.fbq` no existe: ese recorrido no envía ningún
 * evento. Solo afecta al staff (los clientes no pasan por /login).
 */

// Prefijos de rutas privadas donde no se envía ningún evento (panel y auth).
// OJO: mantener sincronizada con $pixelRutasPrivadas en
// resources/views/partials/meta-pixel.blade.php.
const PRIVATE_PATHS = [
    'admin',
    'dashboard',
    'profile',
    'login',
    'forgot-password',
    'reset-password',
    'verify-email',
    'confirm-password',
    'password',
];

export const CURRENCY = 'ARS';

/** `path` puede traer query/hash; se compara por segmento (admin y admin/x, no administracion). */
export const isTrackablePath = (path) => {
    const [pathname] = String(path).split(/[?#]/);
    const normalized = pathname.replace(/^\/+/, '');
    return !PRIVATE_PATHS.some((base) => normalized === base || normalized.startsWith(`${base}/`));
};

/** Id de contenido idéntico en ViewContent, AddToCart, InitiateCheckout y Purchase. */
export const productContentId = (id) => `prod_${id}`;
export const comboContentId = (id) => `combo_${id}`;

/** Id de contenido de una línea del carrito (producto o combo). */
export const cartItemContentId = (item) =>
    item.tipo === 'combo' ? comboContentId(item.combo_id) : productContentId(item.producto_id);

/**
 * Dispara un evento estándar. `eventID` (opcional) permite deduplicar contra la API
 * de conversiones; se manda como cuarto argumento de fbq.
 */
export const track = (event, params = {}, { eventID } = {}) => {
    if (!isTrackablePath(window.location.pathname)) return;
    if (eventID) {
        window.fbq?.('track', event, params, { eventID });
    } else {
        window.fbq?.('track', event, params);
    }
};

/**
 * Params de ViewContent / AddToCart para un producto o combo.
 * `tipo`: 'producto' | 'combo'. `cantidad` solo para AddToCart (va en `contents`).
 */
export const itemEventParams = ({ tipo = 'producto', id, titulo, value, cantidad }) => {
    const contentId = tipo === 'combo' ? comboContentId(id) : productContentId(id);
    return {
        content_ids: [contentId],
        content_name: titulo,
        content_type: 'product',
        value: Number(value),
        currency: CURRENCY,
        ...(cantidad !== undefined && { contents: [{ id: contentId, quantity: cantidad }] }),
    };
};
