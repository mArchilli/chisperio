import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { resolverPrecio, redondear2 } from '@/lib/pricing';
import { cantidadMaxima } from '@/lib/stock';

const CartContext = createContext(null);
const STORAGE_KEY = 'chisperio_cart';
const STORAGE_KEY_CODIGO = 'chisperio_cart_codigo';

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

function loadCodigoFromStorage() {
    try {
        return localStorage.getItem(STORAGE_KEY_CODIGO) || null;
    } catch {
        return null;
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
    // OJO: este `subtotal` es la base del envío gratis y NO debe redefinirse para
    // reflejar el descuento del código — ver totalConDescuento más abajo, que es el
    // valor con descuento, y BarraEnvioGratis/envioGratisAlcanzado en Carrito.jsx,
    // que deben seguir leyendo `subtotal` (Fase 3 del plan de códigos de descuento).
    const subtotal = itemsConPrecio.reduce((acc, item) => acc + item.subtotalItem, 0);
    // Última foto de stock conocida para cada item (ver snapshotProducto): si algún item
    // quedó en 0, no tiene sentido dejar avanzar al checkout con ese carrito tal cual.
    const hayItemsSinStock = itemsConPrecio.some((item) => item.sinStock);

    // --- Código de descuento ---
    // `codigoAplicado` persiste igual que `items` (localStorage), para que sobreviva
    // a la navegación de Carrito.jsx a Checkout.jsx. `descuentoInfo` NO se persiste:
    // es el último resultado de CodigoDescuentoService::validar() (vía el endpoint
    // público) y se vuelve a pedir al montar y cada vez que cambia `subtotal`.
    const [codigoAplicado, setCodigoAplicado] = useState(loadCodigoFromStorage);
    const [descuentoInfo, setDescuentoInfo] = useState(null);
    const [validandoCodigo, setValidandoCodigo] = useState(false);

    useEffect(() => {
        try {
            if (codigoAplicado) {
                localStorage.setItem(STORAGE_KEY_CODIGO, codigoAplicado);
            } else {
                localStorage.removeItem(STORAGE_KEY_CODIGO);
            }
        } catch {}
    }, [codigoAplicado]);

    // Valida `codigo` contra el subtotal BRUTO actual. Esto es solo una previsualización
    // para UX (ver CodigoDescuentoService::validar en el backend) — no incrementa
    // usos_actuales ni garantiza nada por sí sola; eso es responsabilidad del checkout
    // real en la Fase 4.
    const aplicarCodigoDescuento = useCallback(async (codigoInput) => {
        const codigo = String(codigoInput ?? '').trim().toUpperCase();
        if (!codigo) return;

        setValidandoCodigo(true);

        try {
            const response = await fetch('/api/codigos-descuento/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ codigo, subtotal }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const resultado = await response.json();
            setDescuentoInfo(resultado);
            // Si el backend lo rechaza (inexistente, inactivo, vencido, límite de usos),
            // no queda nada "aplicado" — el motivo se expone igual vía descuentoInfo
            // para mostrarlo como error.
            setCodigoAplicado(resultado.valido ? codigo : null);
        } catch {
            // Red caída, timeout o el servidor no responde: no dejamos el spinner
            // colgado ni un código "aplicado" que en realidad no pudimos confirmar.
            setDescuentoInfo({
                valido: false,
                motivo: 'No pudimos validar el código. Probá de nuevo en un momento.',
                monto_descuento: 0,
                subtotal_con_descuento: subtotal,
            });
            setCodigoAplicado(null);
        } finally {
            setValidandoCodigo(false);
        }
    }, [subtotal]);

    const quitarCodigoDescuento = useCallback(() => {
        setCodigoAplicado(null);
        setDescuentoInfo(null);
    }, []);

    // Revalidación automática: si el subtotal cambia mientras hay un código aplicado
    // (se agregó/sacó/cambió cantidad de algún ítem), se vuelve a validar contra el
    // nuevo subtotal. Si el código deja de ser válido (p. ej. otro cliente agotó el
    // límite de usos mientras este carrito estaba abierto), aplicarCodigoDescuento ya
    // lo deja en codigoAplicado=null y expone el motivo — no queda un descuento
    // aplicado que el backend ya no considera válido. También corre al montar, para
    // revalidar un código que persistió desde una sesión anterior.
    useEffect(() => {
        if (!codigoAplicado) return;
        aplicarCodigoDescuento(codigoAplicado);
        // Solo debe reaccionar a cambios de `subtotal`: `codigoAplicado` y
        // `aplicarCodigoDescuento` ya están al día en cada render por el closure de
        // este efecto, y sumarlos como dependencias duplicaría el fetch al aplicar
        // manualmente un código nuevo (eso ya dispara su propio setCodigoAplicado).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subtotal]);

    const montoDescuento = descuentoInfo?.monto_descuento ?? 0;
    // Total a pagar con el descuento ya aplicado. Es el valor que eventualmente viaja
    // a checkout — `subtotal` sigue siendo la base del envío gratis, nunca este valor.
    const totalConDescuento = redondear2(subtotal - montoDescuento);

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
                codigoAplicado,
                descuentoInfo,
                validandoCodigo,
                montoDescuento,
                totalConDescuento,
                aplicarCodigoDescuento,
                quitarCodigoDescuento,
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
