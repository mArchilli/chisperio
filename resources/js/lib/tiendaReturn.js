// Memoria del catálogo: al entrar a una ficha desde el listado se guarda qué producto se
// tocó y con qué filtros/búsqueda/tandas cargadas estaba el usuario, para que el botón
// "Volver al catálogo" deje todo como estaba. Vive en sessionStorage (dura la pestaña).

const STORAGE_KEY = 'tiendaReturn';

// Tiene que coincidir con el tamaño de tanda de TiendaController (paginate).
export const TIENDA_PAGE_SIZE = 24;

export const cardKey = (producto) => `${producto.tipo === 'combo' ? 'c' : 'p'}-${producto.id}`;

export const cardDomId = (key) => `card-${key}`;

export function saveTiendaReturn(key, query) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ key, query }));
    } catch {}
}

/**
 * Href del catálogo para volver desde la ficha `key`. Si el usuario venía de ese mismo
 * producto en el listado, vuelve con sus filtros y apuntando a la card; si no (entró por
 * la home, un link directo, etc.), vuelve al catálogo sin filtros.
 */
export function tiendaReturnHref(key) {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
        if (saved?.key === key) {
            return `${route('tienda.index', saved.query ?? {})}#${cardDomId(key)}`;
        }
    } catch {}
    return route('tienda.index');
}
