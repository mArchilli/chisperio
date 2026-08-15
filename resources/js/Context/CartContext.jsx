import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { resolverPrecio, redondear2 } from '@/lib/pricing';
import { cantidadMaxima } from '@/lib/stock';

const CartContext = createContext(null);
const STORAGE_KEY = 'chisperio_cart';

/**
 * Subconjunto de `producto` que necesita resolverPrecio (precio base, escalas,
 * oferta vigente con su alcance) más `stock`, para poder capear la cantidad
 * seleccionable en el carrito. Se guarda tal cual en cada item del carrito en vez
 * de un precio_display fijo, para poder recalcular en cada render.
 *
 * Ojo: esto es una FOTO del stock al momento de agregar (o de volver a agregar) el
 * producto — si el stock baja mientras el item ya está en un carrito guardado en
 * localStorage de una sesión anterior, este snapshot queda desactualizado hasta
 * que el usuario vuelve a tocar ese producto. El chequeo real y definitivo sigue
 * siendo el del backend en el checkout (StockService, Fase 3).
 */
function snapshotProducto(producto) {
    return {
        id: producto.id,
        titulo: producto.titulo,
        precio: Number(producto.precio),
        escalas_precio: producto.escalas_precio ?? [],
        oferta_vigente: producto.oferta_vigente ?? null,
        stock: producto.stock ?? null,
    };
}

function esItemValido(item) {
    return (
        item &&
        typeof item === 'object' &&
        typeof item.id !== 'undefined' &&
        typeof item.cantidad === 'number' &&
        item.producto &&
        typeof item.producto === 'object' &&
        typeof item.producto.precio !== 'undefined'
    );
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        // Carritos guardados con el shape viejo (precio_display fijo, sin la clave
        // `producto`) no traen los datos crudos que necesita resolverPrecio (escalas
        // de precio, oferta vigente) — no se pueden migrar in-place, así que se
        // invalida el carrito completo en vez de arrastrar precios potencialmente
        // incorrectos.
        if (!parsed.every(esItemValido)) return [];

        return parsed;
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadFromStorage);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

    const addToCart = useCallback((producto, qty = 1) => {
        const productoSnapshot = snapshotProducto(producto);
        const max = cantidadMaxima(productoSnapshot);
        const capear = (cantidad) => (max === null ? cantidad : Math.min(cantidad, max));

        setItems((prev) => {
            const existing = prev.find((item) => item.id === producto.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === producto.id
                        ? { ...item, producto: productoSnapshot, cantidad: capear(item.cantidad + qty) }
                        : item
                );
            }
            return [
                ...prev,
                {
                    id: producto.id,
                    titulo: producto.titulo,
                    imagen: producto.imagen_principal?.ruta ?? null,
                    cantidad: capear(qty),
                    producto: productoSnapshot,
                },
            ];
        });
    }, []);

    const removeFromCart = useCallback((id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    // Capea a `producto.stock` (la última foto que tenemos de ese producto — ver
    // snapshotProducto) cuando no es ilimitado. No hace nada si `qty` da 0 o menos:
    // para vaciar un item sin stock se usa removeFromCart, no bajar el contador a 0.
    const updateQty = useCallback((id, qty) => {
        if (qty < 1) return;
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const max = cantidadMaxima(item.producto);
                return { ...item, cantidad: max === null ? qty : Math.min(qty, max) };
            })
        );
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    // Precio unitario y subtotal de cada item se resuelven acá, en cada render,
    // con la misma resolverPrecio() que usa ShowProduct (espejo de PricingService)
    // en vez de quedar fijados al momento de agregar el producto. Así, cambiar la
    // cantidad desde Carrito.updateQty recalcula automáticamente si se cruza un
    // umbral de escala o el nivel al que apunta la oferta vigente.
    const itemsConPrecio = useMemo(
        () =>
            items.map((item) => {
                const precioInfo = resolverPrecio(item.producto, item.cantidad);
                const stockDisponible = cantidadMaxima(item.producto);
                return {
                    ...item,
                    precioInfo,
                    precioUnitario: precioInfo.precioFinal,
                    subtotalItem: redondear2(precioInfo.precioFinal * item.cantidad),
                    stockDisponible,
                    sinStock: stockDisponible === 0,
                };
            }),
        [items]
    );

    const cartCount = items.reduce((acc, item) => acc + item.cantidad, 0);
    const subtotal = itemsConPrecio.reduce((acc, item) => acc + item.subtotalItem, 0);
    // Última foto de stock conocida para cada item (ver snapshotProducto): si algún item
    // quedó en 0, no tiene sentido dejar avanzar al checkout con ese carrito tal cual.
    const hayItemsSinStock = itemsConPrecio.some((item) => item.sinStock);

    return (
        <CartContext.Provider
            value={{
                items: itemsConPrecio,
                addToCart,
                removeFromCart,
                updateQty,
                clearCart,
                cartCount,
                subtotal,
                hayItemsSinStock,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
    return ctx;
}
