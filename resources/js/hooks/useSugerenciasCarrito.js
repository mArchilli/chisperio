import { useEffect, useMemo, useState } from 'react';

const DEBOUNCE_MS = 250;

/**
 * Ids de los productos que hay en el carrito. Una línea de combo aporta los productos
 * de su receta (el snapshot de combo trae `items[].producto_id`), así lo que ya viene en
 * un combo tampoco se sugiere de nuevo.
 */
function idsEnCarrito(items) {
    const ids = new Set();

    items.forEach((item) => {
        if (item.tipo === 'combo') {
            (item.combo?.items ?? []).forEach((comboItem) => ids.add(comboItem.producto_id));
        } else if (item.producto_id) {
            ids.add(item.producto_id);
        }
    });

    return [...ids].sort((a, b) => a - b);
}

/**
 * Productos sugeridos para lo que hay en el carrito (los elige el admin, ver
 * TiendaController::sugerenciasCarrito). El carrito vive en el navegador, por eso se
 * consultan al servidor mandando los ids. Si el pedido falla, simplemente no hay
 * sugerencias: nunca debe romper el carrito.
 */
export function useSugerenciasCarrito(items) {
    const ids = useMemo(() => idsEnCarrito(items), [items]);
    const clave = ids.join(',');
    const [productos, setProductos] = useState([]);

    useEffect(() => {
        if (ids.length === 0) {
            setProductos([]);
            return undefined;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(async () => {
            try {
                const url = route('carrito.sugerencias', { productos: ids });
                const respuesta = await fetch(url, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (!respuesta.ok) return;
                const data = await respuesta.json();
                setProductos(data.productos ?? []);
            } catch {
                // Sin red o abortado: se conservan las sugerencias que ya había.
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
        // `clave` resume `ids`: evita re-consultar si cambia solo la cantidad de una línea.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]);

    // Entre el cambio del carrito y la respuesta, nunca se muestra algo que ya se agregó.
    return useMemo(() => productos.filter((p) => !ids.includes(p.id)), [productos, ids]);
}
