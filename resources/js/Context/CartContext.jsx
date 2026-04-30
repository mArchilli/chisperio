import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'chisperio_cart';

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
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
        const hasOffer = !!producto.oferta_vigente;
        const precio_display = hasOffer
            ? Number(producto.oferta_vigente.precio_oferta)
            : Number(producto.precio);

        setItems((prev) => {
            const existing = prev.find((item) => item.id === producto.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === producto.id
                        ? { ...item, cantidad: item.cantidad + qty }
                        : item
                );
            }
            return [
                ...prev,
                {
                    id: producto.id,
                    titulo: producto.titulo,
                    precio: Number(producto.precio),
                    precio_display,
                    imagen: producto.imagen_principal?.ruta ?? null,
                    cantidad: qty,
                },
            ];
        });
    }, []);

    const removeFromCart = useCallback((id) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const updateQty = useCallback((id, qty) => {
        if (qty < 1) return;
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, cantidad: qty } : item))
        );
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const cartCount = items.reduce((acc, item) => acc + item.cantidad, 0);
    const subtotal = items.reduce((acc, item) => acc + item.precio_display * item.cantidad, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, cartCount, subtotal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
    return ctx;
}
