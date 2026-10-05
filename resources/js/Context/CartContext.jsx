import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { resolverPrecio, redondear2 } from '@/lib/pricing';
import { cantidadMaxima } from '@/lib/stock';
import { stockDisponibleCombo } from '@/lib/combo';
import { envioGratisPorCombo as calcularEnvioGratisPorCombo, hayComboConEnvioGratis as calcularHayComboConEnvioGratis } from '@/lib/envioGratis';
import { calcular as calcularRecargoPago } from '@/lib/recargoPago';
import { track, itemEventParams } from '@/lib/pixel';

const CartContext = createContext(null);
const STORAGE_KEY = 'chisperio_cart';
const STORAGE_KEY_CODIGO = 'chisperio_cart_codigo';
const STORAGE_KEY_FORMA_PAGO = 'chisperio_forma_pago';

/**
 * Subconjunto de `producto` que necesita resolverPrecio (precio base, escalas,
 * oferta vigente con su alcance, variantes y add-ons) más `stock`, para poder
 * capear la cantidad seleccionable en el carrito. Se guarda tal cual en cada item
 * del carrito en vez de un precio_display fijo, para poder recalcular en cada render.
 *
 * Ojo: esto es una FOTO del producto al momento de agregar (o de volver a agregar)
 * el producto — si el stock baja, una variante/addon se desactiva, o cambia un
 * precio mientras el item ya está en un carrito guardado en localStorage de una
 * sesión anterior, este snapshot queda desactualizado hasta que el usuario vuelve a
 * tocar ese producto. La revalidación al montar (ver revalidarCarritoAlMontar más
 * abajo) cubre el caso de variante/addon que dejó de existir o se desactivó; el
 * chequeo real y definitivo de todo lo demás sigue siendo el del backend en el
 * checkout (StockService, Fase 3).
 */
function snapshotVariante(variante) {
    return {
        id: variante.id,
        nombre: variante.nombre,
        color_hex: variante.color_hex ?? null,
        precio_adicional: Number(variante.precio_adicional ?? 0),
        stock: variante.stock ?? null,
        is_active: variante.is_active !== false,
    };
}

function snapshotAddon(addon) {
    return {
        id: addon.id,
        nombre: addon.nombre,
        precio: Number(addon.precio),
        is_active: addon.is_active !== false,
        pivot: addon.pivot ? { precio_override: addon.pivot.precio_override ?? null } : null,
    };
}

function snapshotProducto(producto) {
    return {
        id: producto.id,
        titulo: producto.titulo,
        precio: Number(producto.precio),
        escalas_precio: producto.escalas_precio ?? [],
        oferta_vigente: producto.oferta_vigente ?? null,
        stock: producto.stock ?? null,
        variantes: (producto.variantes ?? []).map(snapshotVariante),
        addons: (producto.addons ?? []).map(snapshotAddon),
    };
}

/**
 * Subconjunto de `combo` que necesita resolverPrecio (precio fijo, sin escalas) y
 * stockDisponibleCombo (items con su producto/variantes activas), guardado como foto
 * del combo al momento de agregarlo — mismo espíritu que snapshotProducto. El combo
 * ya viene "duck-typed" como un producto desde el backend (TiendaController): sin
 * escalas de precio y con `oferta_vigente` en la misma forma tipo_descuento/valor_descuento.
 */
function snapshotCombo(combo) {
    return {
        id: combo.id,
        titulo: combo.titulo,
        precio: Number(combo.precio),
        escalas_precio: [],
        oferta_vigente: combo.oferta_vigente ?? null,
        envio_gratis: combo.envio_gratis ?? false,
        items: (combo.items ?? []).map((item) => ({
            id: item.id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            producto_variante_id: item.producto_variante_id ?? null,
            producto: item.producto
                ? {
                      id: item.producto.id,
                      titulo: item.producto.titulo,
                      is_active: item.producto.is_active !== false,
                      stock: item.producto.stock ?? null,
                      variantes_activas: item.producto.variantes_activas ?? [],
                  }
                : null,
            producto_variante: item.producto_variante ?? null,
        })),
    };
}

/**
 * Mapa { [comboItemId]: varianteId } a partir del array de selecciones que arma
 * ShowCombo.jsx — shape que espera stockDisponibleCombo (lib/combo.js).
 */
function seleccionPorItem(selecciones) {
    const mapa = {};
    (selecciones ?? []).forEach((s) => {
        mapa[s.comboItemId] = s.varianteId;
    });
    return mapa;
}

/**
 * Identidad de una línea de combo en el carrito: dos combos iguales con distinta
 * combinación de colores elegidos son líneas separadas, mismo criterio que
 * generarLineKey para productos.
 */
function generarComboLineKey(comboId, selecciones) {
    const seleccionesKey = (selecciones ?? [])
        .map((s) => `${s.comboItemId}:${s.varianteId ?? ''}`)
        .sort()
        .join('|');

    return `combo:${comboId}::${seleccionesKey}`;
}

/**
 * Identidad de una línea de carrito: dos líneas del mismo producto con distinta
 * variante, distinta combinación de add-ons/textos de personalización, o distinta
 * descripción de color a medida, son líneas separadas (no se suman cantidades
 * entre sí). Sin variante ni add-ons devuelve directamente el producto_id — mismo
 * valor que usaba `item.id` antes de esta función existir, para no duplicar
 * líneas de carritos ya guardados en el localStorage de usuarios existentes
 * (ver normalizarItem).
 */
function generarLineKey(productoId, varianteId, addons, colorPersonalizadoTexto = null) {
    const tieneVariante = varianteId !== null && varianteId !== undefined;
    const listaAddons = addons || [];

    if (!tieneVariante && listaAddons.length === 0) {
        return String(productoId);
    }

    const addonsKey = listaAddons
        .map((a) => `${a.addon_id}:${(a.texto_personalizado ?? '').trim()}`)
        .sort()
        .join('|');

    const colorKey = (colorPersonalizadoTexto ?? '').trim();

    return `${productoId}::v${tieneVariante ? varianteId : ''}::a[${addonsKey}]::c[${colorKey}]`;
}

function esItemValido(item) {
    if (!item || typeof item !== 'object' || typeof item.cantidad !== 'number') return false;

    if (item.tipo === 'combo') {
        return item.combo && typeof item.combo === 'object' && typeof item.combo.precio !== 'undefined';
    }

    return (
        typeof (item.producto_id ?? item.id) !== 'undefined' &&
        item.producto &&
        typeof item.producto === 'object' &&
        typeof item.producto.precio !== 'undefined'
    );
}

/**
 * Normaliza un item crudo de localStorage al shape actual. Cubre dos casos:
 * el shape viejo (campo `id` = producto_id, sin varianteId/addons/lineKey) y el
 * shape actual (ya con todo). En ambos casos recalcula `lineKey` con
 * generarLineKey en vez de confiar en el valor guardado, así una corrupción o
 * un shape futuro con más campos no puede dejar dos líneas con la misma
 * identidad real pero lineKey distinto.
 */
function normalizarItem(item) {
    if (item.tipo === 'combo') {
        const selecciones = Array.isArray(item.selecciones) ? item.selecciones : [];

        return {
            lineKey: generarComboLineKey(item.combo_id ?? item.combo?.id, selecciones),
            tipo: 'combo',
            combo_id: item.combo_id ?? item.combo?.id,
            titulo: item.titulo,
            imagen: item.imagen ?? null,
            cantidad: item.cantidad,
            combo: item.combo,
            selecciones,
        };
    }

    const productoId = item.producto_id ?? item.id;
    const varianteId = item.varianteId ?? null;
    const addons = Array.isArray(item.addons) ? item.addons : [];
    const colorPersonalizadoTexto = item.colorPersonalizadoTexto ?? null;

    return {
        lineKey: generarLineKey(productoId, varianteId, addons, colorPersonalizadoTexto),
        producto_id: productoId,
        titulo: item.titulo,
        imagen: item.imagen ?? null,
        cantidad: item.cantidad,
        producto: item.producto,
        varianteId,
        variante: item.variante ?? null,
        addons,
        colorPersonalizadoTexto,
    };
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

        return parsed.map(normalizarItem);
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

/**
 * Snapshot de un plan de pago con tarjeta (ver planesPagoTarjeta en
 * HandleInertiaRequests) tal cual lo necesita recargoPago.js, para no depender
 * de que el objeto completo del plan siga vigente/activo en un render futuro.
 */
function snapshotPlanPago(plan) {
    return {
        planId: plan.planId ?? plan.id,
        nombre: plan.nombre,
        cuotas: plan.cuotas,
        recargoPorcentaje: plan.recargoPorcentaje ?? plan.recargo_porcentaje,
    };
}

function loadFormaPagoFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_FORMA_PAGO);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.planId === 'undefined' || typeof parsed.cuotas === 'undefined') return null;
        return snapshotPlanPago(parsed);
    } catch {
        return null;
    }
}

/**
 * Verifica contra GET /api/productos/{id}/precio (el mismo endpoint que
 * ShowProduct usa para el desglose de precio) si una variante/combinación de
 * add-ons sigue siendo válida para el producto: ese endpoint devuelve 422 si la
 * variante/addon no pertenece al producto o está inactiva (ver
 * PricingService::resolverVariante/resolverAddons). Ante una falla de red
 * devuelve `true` (no invalida nada): la validación real y bloqueante sigue
 * siendo la del checkout, esto es solo un aviso proactivo.
 */
async function combinacionValida(productoId, { varianteId = null, addonIds = [] } = {}) {
    const params = new URLSearchParams({ cantidad: '1' });
    if (varianteId !== null && varianteId !== undefined) {
        params.set('variante_id', String(varianteId));
    }
    addonIds.forEach((id) => params.append('addon_ids[]', String(id)));

    try {
        const response = await fetch(`/api/productos/${productoId}/precio?${params.toString()}`, {
            headers: { Accept: 'application/json' },
        });
        return response.ok;
    } catch {
        return true;
    }
}

/**
 * Determina qué parte de una línea (variante y/o add-ons puntuales) dejó de ser
 * válida desde que se agregó al carrito. Primero prueba todo junto (1 request en
 * el caso común de que no cambió nada); si falla, aísla el problema chequeando la
 * variante y cada add-on por separado, porque el endpoint solo devuelve válido/
 * inválido, no cuál de los ids fue el que rechazó. Devuelve `null` si la línea
 * sigue siendo 100% válida.
 */
async function revalidarLinea(item) {
    const productoId = item.producto.id;
    const addonIds = item.addons.map((a) => a.addon_id);
    if (item.varianteId === null && addonIds.length === 0) return null;

    const todoValido = await combinacionValida(productoId, { varianteId: item.varianteId, addonIds });
    if (todoValido) return null;

    const varianteInvalida = item.varianteId !== null
        ? !(await combinacionValida(productoId, { varianteId: item.varianteId }))
        : false;

    const addonsInvalidos = [];
    for (const addonId of addonIds) {
        // eslint-disable-next-line no-await-in-loop
        const valido = await combinacionValida(productoId, { addonIds: [addonId] });
        if (!valido) addonsInvalidos.push(addonId);
    }

    return varianteInvalida || addonsInvalidos.length > 0 ? { varianteInvalida, addonsInvalidos } : null;
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadFromStorage);

    // Estado del drawer flotante del carrito, compartido entre el ícono del navbar
    // (en mobile dispara este drawer en vez de navegar a /carrito, para no competir
    // por espacio con el botón flotante) y el botón flotante de CartButton.jsx.
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const openCartDrawer = useCallback(() => setCartDrawerOpen(true), []);
    const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);
    const toggleCartDrawer = useCallback(() => setCartDrawerOpen((prev) => !prev), []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

    // Agrega `producto` al carrito. `opciones.varianteId`/`opciones.variante` y
    // `opciones.addons` son opcionales (ver ShowProduct.jsx): sin ellos, el
    // comportamiento y el lineKey son idénticos a los de siempre. Con ellos, la
    // línea queda identificada por producto + variante + combinación de add-ons
    // (ver generarLineKey) — agregar el mismo producto con otra variante u otros
    // add-ons crea una línea nueva en vez de sumarse a una existente.
    //
    // `opciones.skipTrack`: no dispara el AddToCart del Meta Pixel. Lo usa quien agrega
    // varias líneas de una sola vez (reparto por colores de ShowProduct) y dispara un
    // único evento agrupado por su cuenta.
    const addToCart = useCallback((producto, qty = 1, opciones = {}) => {
        const { varianteId = null, variante = null, addons = [], colorPersonalizadoTexto = null, skipTrack = false } = opciones;
        const productoSnapshot = snapshotProducto(producto);
        const max = cantidadMaxima(productoSnapshot, varianteId);
        const capear = (cantidad) => (max === null ? cantidad : Math.min(cantidad, max));
        const lineKey = generarLineKey(producto.id, varianteId, addons, colorPersonalizadoTexto);

        if (!skipTrack) {
            const cantidad = capear(qty);
            const { precioFinalConOpciones } = resolverPrecio(
                productoSnapshot,
                cantidad,
                varianteId,
                addons.map((a) => a.addon_id)
            );
            track('AddToCart', itemEventParams({
                id: producto.id,
                titulo: producto.titulo,
                value: precioFinalConOpciones * cantidad,
                cantidad,
            }));
        }

        setItems((prev) => {
            const existing = prev.find((item) => item.lineKey === lineKey);
            if (existing) {
                return prev.map((item) =>
                    item.lineKey === lineKey
                        ? { ...item, producto: productoSnapshot, cantidad: capear(item.cantidad + qty), colorPersonalizadoTexto }
                        : item
                );
            }
            return [
                ...prev,
                {
                    lineKey,
                    producto_id: producto.id,
                    titulo: producto.titulo,
                    imagen: producto.imagen_principal?.ruta ?? null,
                    cantidad: capear(qty),
                    producto: productoSnapshot,
                    varianteId,
                    variante,
                    addons,
                    colorPersonalizadoTexto,
                },
            ];
        });
    }, []);

    // Agrega un combo al carrito. `selecciones` es un array de
    // `{ comboItemId, productoId, varianteId, varianteNombre, varianteColorHex }`,
    // uno por cada item del combo que ComboProducto::requiereSeleccionVariante() —
    // arma ShowCombo.jsx. Dos combos iguales con distinta combinación de colores
    // elegidos quedan en líneas separadas (ver generarComboLineKey).
    const addComboToCart = useCallback((combo, qty = 1, selecciones = [], { skipTrack = false } = {}) => {
        const comboSnapshot = snapshotCombo(combo);
        const max = stockDisponibleCombo(comboSnapshot, seleccionPorItem(selecciones));
        const capear = (cantidad) => (max === null ? cantidad : Math.min(cantidad, max));
        const lineKey = generarComboLineKey(combo.id, selecciones);

        if (!skipTrack) {
            const cantidad = capear(qty);
            const { precioFinalConOpciones } = resolverPrecio(comboSnapshot, cantidad);
            track('AddToCart', itemEventParams({
                tipo: 'combo',
                id: combo.id,
                titulo: combo.titulo,
                value: precioFinalConOpciones * cantidad,
                cantidad,
            }));
        }

        setItems((prev) => {
            const existing = prev.find((item) => item.lineKey === lineKey);
            if (existing) {
                return prev.map((item) =>
                    item.lineKey === lineKey
                        ? { ...item, combo: comboSnapshot, cantidad: capear(item.cantidad + qty) }
                        : item
                );
            }
            return [
                ...prev,
                {
                    lineKey,
                    tipo: 'combo',
                    combo_id: combo.id,
                    titulo: combo.titulo,
                    imagen: combo.imagen_principal?.ruta ?? null,
                    cantidad: capear(qty),
                    combo: comboSnapshot,
                    selecciones,
                },
            ];
        });
    }, []);

    const removeFromCart = useCallback((lineKey) => {
        setItems((prev) => prev.filter((item) => item.lineKey !== lineKey));
    }, []);

    // Capea al stock de la variante (si la línea tiene una) o del producto, cuando
    // no es ilimitado. Para una línea de combo, capea al stock derivado de sus
    // componentes (stockDisponibleCombo) en vez de cantidadMaxima. No hace nada si
    // `qty` da 0 o menos: para vaciar una línea sin stock se usa removeFromCart, no
    // bajar el contador a 0.
    const updateQty = useCallback((lineKey, qty) => {
        if (qty < 1) return;
        setItems((prev) =>
            prev.map((item) => {
                if (item.lineKey !== lineKey) return item;
                if (item.tipo === 'combo') {
                    const max = stockDisponibleCombo(item.combo, seleccionPorItem(item.selecciones));
                    return { ...item, cantidad: max === null ? qty : Math.min(qty, max) };
                }
                const max = cantidadMaxima(item.producto, item.varianteId);
                return { ...item, cantidad: max === null ? qty : Math.min(qty, max) };
            })
        );
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    /**
     * Aplica el resultado de revalidarLinea: quita la variante y/o los add-ons que
     * dejaron de ser válidos, recalcula el lineKey de la línea y, si ese lineKey
     * nuevo coincide con el de otra línea ya existente (ej. quedan dos líneas del
     * mismo producto sin opciones tras perder su única diferencia), las fusiona en
     * vez de dejar dos líneas separadas. Avisa el cambio con el mismo patrón de
     * notificación (react-hot-toast) que usa CartButton para envío gratis.
     */
    const aplicarRevalidacion = useCallback((lineKeyOriginal, varianteInvalida, addonIdsInvalidos) => {
        let mensaje = null;

        setItems((prev) => {
            const item = prev.find((i) => i.lineKey === lineKeyOriginal);
            if (!item) return prev;

            const nuevoVarianteId = varianteInvalida ? null : item.varianteId;
            const nuevaVariante = varianteInvalida ? null : item.variante;
            const nuevoColorPersonalizadoTexto = varianteInvalida ? null : item.colorPersonalizadoTexto;
            const nuevosAddons = item.addons.filter((a) => !addonIdsInvalidos.includes(a.addon_id));
            const nuevoLineKey = generarLineKey(item.producto_id, nuevoVarianteId, nuevosAddons, nuevoColorPersonalizadoTexto);

            const partesPerdidas = [];
            if (varianteInvalida && item.variante) {
                partesPerdidas.push(`el color "${item.variante.nombre}"`);
            }
            const nombresAddonsPerdidos = item.addons
                .filter((a) => addonIdsInvalidos.includes(a.addon_id))
                .map((a) => `"${a.nombre}"`);
            if (nombresAddonsPerdidos.length > 0) {
                partesPerdidas.push(
                    (nombresAddonsPerdidos.length === 1 ? 'la personalización ' : 'las personalizaciones ') +
                        nombresAddonsPerdidos.join(', ')
                );
            }
            mensaje = `${item.titulo}: ${partesPerdidas.join(' y ')} ya no está disponible y se quitó de tu carrito.`;

            const restantes = prev.filter((i) => i.lineKey !== lineKeyOriginal);
            const max = cantidadMaxima(item.producto, nuevoVarianteId);
            const capear = (c) => (max === null ? c : Math.min(c, max));

            const destino = restantes.find((i) => i.lineKey === nuevoLineKey);
            if (destino) {
                return restantes.map((i) =>
                    i.lineKey === nuevoLineKey ? { ...i, cantidad: capear(i.cantidad + item.cantidad) } : i
                );
            }

            return [
                ...restantes,
                {
                    ...item,
                    lineKey: nuevoLineKey,
                    varianteId: nuevoVarianteId,
                    variante: nuevaVariante,
                    colorPersonalizadoTexto: nuevoColorPersonalizadoTexto,
                    addons: nuevosAddons,
                    cantidad: capear(item.cantidad),
                },
            ];
        });

        if (mensaje) toast.error(mensaje);
    }, []);

    // Revalida las líneas con variante/add-ons contra el producto actual una sola
    // vez al montar (carga del carrito persistido en localStorage): si el admin
    // desactivó o borró una variante/addon después de que el cliente lo agregó,
    // se quita de la línea y se avisa. Corre una sola vez a propósito — agregar o
    // editar líneas después no debe volver a disparar esta revalidación, y `items`
    // acá es el valor inicial (el de loadFromStorage) por el closure del efecto.
    useEffect(() => {
        let cancelado = false;

        (async () => {
            for (const item of items) {
                // Las líneas de combo no pasan por este chequeo (no tienen un único
                // producto_id contra el que consultar /api/productos/{id}/precio) — el
                // checkout vuelve a resolver y validar cada selección server-side igual.
                if (item.tipo === 'combo') continue;
                if (item.varianteId === null && item.addons.length === 0) continue;
                // eslint-disable-next-line no-await-in-loop
                const resultado = await revalidarLinea(item);
                if (cancelado || !resultado) continue;
                aplicarRevalidacion(item.lineKey, resultado.varianteInvalida, resultado.addonsInvalidos);
            }
        })();

        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Precio unitario y subtotal de cada item se resuelven acá, en cada render,
    // con la misma resolverPrecio() que usa ShowProduct (espejo de PricingService)
    // en vez de quedar fijados al momento de agregar el producto. Así, cambiar la
    // cantidad desde Carrito.updateQty recalcula automáticamente si se cruza un
    // umbral de escala o el nivel al que apunta la oferta vigente. precioUnitario/
    // subtotalItem usan precioFinalConOpciones (precio con oferta + recargo de
    // variante + total de add-ons) para que el subtotal de la línea ya refleje todo.
    // Total de unidades por producto sumando TODAS sus líneas: un producto repartido
    // en varias líneas (una por color, ver el repartidor de ShowProduct) resuelve su
    // precio por cantidad sobre este total, no sobre la cantidad de cada línea suelta
    // — mismo criterio que PedidoController::store en el checkout.
    const cantidadPorProducto = useMemo(() => {
        const acc = {};
        for (const item of items) {
            if (item.tipo === 'combo') continue;
            acc[item.producto_id] = (acc[item.producto_id] ?? 0) + item.cantidad;
        }
        return acc;
    }, [items]);

    const itemsConPrecio = useMemo(
        () =>
            items.map((item) => {
                if (item.tipo === 'combo') {
                    // El precio del combo es fijo (no depende de escalas/variante/add-ons) —
                    // resolverPrecio igual funciona porque el combo viene "duck-typed" como
                    // un producto (escalas_precio: [], oferta_vigente con la misma forma).
                    const precioInfo = resolverPrecio(item.combo, item.cantidad);
                    const stockDisponible = stockDisponibleCombo(item.combo, seleccionPorItem(item.selecciones));
                    return {
                        ...item,
                        precioInfo,
                        precioUnitario: precioInfo.precioFinalConOpciones,
                        subtotalItem: redondear2(precioInfo.precioFinalConOpciones * item.cantidad),
                        stockDisponible,
                        sinStock: stockDisponible === 0,
                    };
                }

                const addonIds = item.addons.map((a) => a.addon_id);
                const cantidadParaEscala = cantidadPorProducto[item.producto_id] ?? item.cantidad;
                const precioInfo = resolverPrecio(item.producto, item.cantidad, item.varianteId, addonIds, cantidadParaEscala);
                const stockDisponible = cantidadMaxima(item.producto, item.varianteId);
                return {
                    ...item,
                    precioInfo,
                    precioUnitario: precioInfo.precioFinalConOpciones,
                    subtotalItem: redondear2(precioInfo.precioFinalConOpciones * item.cantidad),
                    stockDisponible,
                    sinStock: stockDisponible === 0,
                };
            }),
        [items, cantidadPorProducto]
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
    // Envío gratis del combo: solo si el carrito es únicamente combos con envío gratis (ver lib/envioGratis).
    const envioGratisPorCombo = calcularEnvioGratisPorCombo(itemsConPrecio);
    const hayComboConEnvioGratis = calcularHayComboConEnvioGratis(itemsConPrecio);

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

    // --- Forma de pago sugerida ---
    // Elegida en ShowProduct (paso 2 del simulador de un producto puntual) pero
    // vive a nivel de todo el pedido, no de una línea del carrito: se persiste
    // aparte (STORAGE_KEY_FORMA_PAGO) para que Carrito y Checkout la lean y el
    // cliente la pueda cambiar/quitar después sin tocar las líneas de productos.
    // Gana la última elección — seleccionar un plan desde cualquier producto
    // reemplaza el que hubiera quedado guardado de una visita a otro producto.
    const [formaPagoSeleccionada, setFormaPagoState] = useState(loadFormaPagoFromStorage);

    useEffect(() => {
        try {
            if (formaPagoSeleccionada) {
                localStorage.setItem(STORAGE_KEY_FORMA_PAGO, JSON.stringify(formaPagoSeleccionada));
            } else {
                localStorage.removeItem(STORAGE_KEY_FORMA_PAGO);
            }
        } catch {}
    }, [formaPagoSeleccionada]);

    const setFormaPago = useCallback((plan) => {
        setFormaPagoState(plan ? snapshotPlanPago(plan) : null);
    }, []);

    // Recargo de la forma de pago sugerida sobre el total que el cliente realmente
    // va a pagar (`totalConDescuento`, ya con el código de descuento aplicado si
    // corresponde) — no sobre el subtotal bruto, para no cobrar recargo de tarjeta
    // sobre un monto que el descuento ya bajó. Se recalcula en cada render en vez
    // de guardarse fijo, igual que itemsConPrecio, para no arrastrar un monto viejo
    // si cambia el carrito o el descuento. calcularRecargoPago espera
    // `cuotas`/`recargo_porcentaje` (mismo shape que manda el backend); el
    // snapshot guarda `recargoPorcentaje` en camelCase, así que se traduce acá en
    // vez de duplicar ese shape en el storage.
    const recargoFormaPago = useMemo(
        () =>
            formaPagoSeleccionada
                ? calcularRecargoPago(totalConDescuento, {
                      cuotas: formaPagoSeleccionada.cuotas,
                      recargo_porcentaje: formaPagoSeleccionada.recargoPorcentaje,
                  })
                : null,
        [formaPagoSeleccionada, totalConDescuento]
    );

    // Única fuente de verdad para "cuánto paga el cliente en definitiva": con
    // efectivo/transferencia es totalConDescuento tal cual (nada cambia respecto
    // a hoy), con un plan de tarjeta seleccionado ya incluye su recargo. Carrito,
    // Checkout y el mensaje de WhatsApp arman su desglose final a partir de este
    // mismo valor, para no recalcularlo cada uno por su lado.
    const totalFinal = recargoFormaPago ? recargoFormaPago.total_con_recargo : totalConDescuento;

    return (
        <CartContext.Provider
            value={{
                items: itemsConPrecio,
                envioGratisPorCombo,
                hayComboConEnvioGratis,
                addToCart,
                addComboToCart,
                removeFromCart,
                updateQty,
                clearCart,
                cartDrawerOpen,
                openCartDrawer,
                closeCartDrawer,
                toggleCartDrawer,
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
                formaPagoSeleccionada,
                setFormaPago,
                recargoFormaPago,
                totalFinal,
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
