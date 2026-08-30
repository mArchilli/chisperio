import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import TablaPreciosPorCantidad from '@/Components/TablaPreciosPorCantidad';
import PillsCantidad from '@/Components/PillsCantidad';
import ProductImageLightbox from '@/Components/ProductImageLightbox';
import VarianteColorSwatches from '@/Components/VarianteColorSwatches';
import RepartoVariantes from '@/Components/RepartoVariantes';
import ProductoAddonsChecklist from '@/Components/ProductoAddonsChecklist';
import { useCart } from '@/Context/CartContext';
import { redondear2, resolverPrecio } from '@/lib/pricing';
import { calcular as calcularRecargoPago } from '@/lib/recargoPago';
import { resolverMediaParaVariante } from '@/lib/media';
import { cantidadMaxima, cantidadMaximaTotalVariantes, capearCantidad, sinStock, tieneStockBajo } from '@/lib/stock';

/**
 * Cantidad inicial: toma `?qty=` de la URL si vino de un pill tocado en una card
 * del catálogo (ver Tienda.jsx) — así la ficha abre mostrando el mismo nivel de
 * precio que el usuario ya había elegido, en vez de resetear a 1. Capeada al stock
 * disponible del producto (si no es ilimitado).
 */
function qtyInicialDesdeUrl(producto) {
    if (typeof window === 'undefined') return 1;
    const valor = parseInt(new URLSearchParams(window.location.search).get('qty'), 10);
    const qty = Number.isFinite(valor) && valor >= 1 ? valor : 1;
    return capearCantidad(producto, qty);
}

const topeStockVariante = (variante) =>
    variante.stock === null || variante.stock === undefined ? Infinity : Math.max(0, variante.stock);

/**
 * Ajusta el reparto de colores (`{ [varianteId]: count }`) para que sume exactamente
 * `objetivo` unidades: respeta lo ya asignado (clampeado al stock de cada color) y
 * rellena lo que falte empezando por `preferidoId` (el color "actual") y siguiendo
 * por el orden de `variantes`. Así "todas del mismo color" es el default sin que el
 * cliente toque nada al subir la cantidad. Recorta si venía asignado de más.
 */
function normalizarAsignaciones(previas, objetivo, variantes, preferidoId) {
    const next = {};
    let asignado = 0;

    for (const v of variantes) {
        const c = Math.max(0, Math.min(previas[v.id] ?? 0, topeStockVariante(v), objetivo - asignado));
        if (c > 0) {
            next[v.id] = c;
            asignado += c;
        }
    }

    if (asignado < objetivo) {
        const ordenados = [
            ...variantes.filter((v) => v.id === preferidoId),
            ...variantes.filter((v) => v.id !== preferidoId),
        ];
        for (const v of ordenados) {
            if (asignado >= objetivo) break;
            const espacio = Math.min(topeStockVariante(v) - (next[v.id] ?? 0), objetivo - asignado);
            if (espacio > 0) {
                next[v.id] = (next[v.id] ?? 0) + espacio;
                asignado += espacio;
            }
        }
    }

    return next;
}

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

// Evita "20.00%" cuando el recargo cargado en el admin es un entero (caso más común)
// y "12.50%" en vez de "12.5%" cuando tiene un solo decimal significativo.
const formatPercent = (valor) => `${parseFloat(Number(valor).toFixed(2))}%`;

function ArrowIcon({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.25}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

function PlayIcon({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
        </svg>
    );
}

function GalleryThumb({ item, i, total, activeIdx, onSelect }) {
    const isVideo = item.kind === 'video';

    return (
        <button
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Ver ${isVideo ? 'video' : 'imagen'} ${i + 1} de ${total}`}
            aria-pressed={i === activeIdx}
            className={`group/thumb relative aspect-square w-24 flex-shrink-0 overflow-hidden rounded-2xl border bg-[#f6f3f8] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 lg:w-auto ${
                i === activeIdx
                    ? 'border-[#6000ca] shadow-[0_10px_25px_-18px_rgba(96,0,202,0.8)]'
                    : 'border-black/[0.06] hover:border-[#6000ca]/35'
            }`}
        >
            {isVideo ? (
                <>
                    <video src={`/${item.ruta}`} muted preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                        <PlayIcon className="h-6 w-6" />
                    </span>
                </>
            ) : (
                <img
                    src={`/${item.ruta}`}
                    alt=""
                    className="h-full w-full object-contain p-2.5 mix-blend-multiply transition-transform duration-300 group-hover/thumb:scale-105 motion-reduce:transition-none"
                />
            )}
            {i === activeIdx && (
                <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[#6000ca]" />
            )}
        </button>
    );
}

function ProductGallery({ imagenes, videos, titulo }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Al cambiar de color el set de imágenes/video puede ser otro (ver
    // resolverMediaParaVariante en ShowProduct); sin este reset, activeIdx podía
    // quedar apuntando a un índice de la selección anterior que ya no corresponde.
    useEffect(() => {
        setActiveIdx(0);
    }, [imagenes, videos]);

    const items = useMemo(
        () => [
            ...(imagenes ?? []).map((item) => ({ ...item, kind: 'imagen' })),
            ...(videos ?? []).map((item) => ({ ...item, kind: 'video' })),
        ],
        [imagenes, videos]
    );

    if (items.length === 0) {
        return (
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-[#f6f3f8] sm:rounded-[2rem] md:aspect-[4/3] lg:aspect-square">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[38px] border-[#6000ca]/[0.035]" />
                <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#FF00D4]/[0.025] blur-2xl" />
                <span className="relative flex h-36 w-36 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-7xl font-black text-[#6000ca]/20 shadow-[0_18px_50px_-30px_rgba(96,0,202,0.45)] sm:h-44 sm:w-44 sm:text-8xl">
                    {titulo?.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    const current = items[activeIdx];
    // Las imágenes ocupan siempre los primeros índices de `items` (se arman antes que
    // los videos), así que mientras el activo sea una imagen, su índice acá es
    // directamente el mismo que necesita el lightbox (que solo conoce imágenes).
    const imagenesSolas = items.filter((item) => item.kind === 'imagen');

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="group relative aspect-square w-full overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-[#f6f3f8] sm:rounded-[2rem] md:aspect-[4/3] lg:aspect-square">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-[46px] border-white/45" />
                <div className="pointer-events-none absolute -bottom-20 -left-12 h-60 w-60 rounded-full bg-[#6000ca]/[0.035] blur-2xl" />

                {current.kind === 'video' ? (
                    <video
                        key={current.id}
                        src={`/${current.ruta}`}
                        controls
                        playsInline
                        className="relative h-full w-full object-contain p-3 sm:p-5"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        aria-label="Ver imagen ampliada"
                        className="relative block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                    >
                        <img
                            src={`/${current.ruta}`}
                            alt={titulo}
                            className="relative h-full w-full object-contain p-5 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.015] sm:p-8 lg:p-10 motion-reduce:transition-none"
                        />
                    </button>
                )}

                {items.length > 1 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4 md:hidden">
                        <div className="flex items-center rounded-full border border-white/70 bg-white/85 px-1.5 shadow-lg shadow-[#1c1b1b]/10 backdrop-blur-md">
                            {items.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveIdx(i)}
                                    aria-label={`Ver ${items[i].kind === 'video' ? 'video' : 'imagen'} ${i + 1} de ${items.length}`}
                                    aria-pressed={i === activeIdx}
                                    className="flex h-10 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                                >
                                    <span
                                        className={`block rounded-full transition-all duration-200 ${
                                            i === activeIdx
                                                ? 'h-2 w-6 bg-[#6000ca]'
                                                : 'h-2 w-2 bg-[#b9afc3]'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <div className="hidden gap-3 overflow-x-auto md:flex lg:grid lg:grid-cols-4 lg:overflow-visible">
                    {items.slice(0, 4).map((item, i) => (
                        <GalleryThumb
                            key={i}
                            item={item}
                            i={i}
                            total={items.length}
                            activeIdx={activeIdx}
                            onSelect={setActiveIdx}
                        />
                    ))}
                </div>
            )}

            {lightboxOpen && (
                <ProductImageLightbox
                    images={imagenesSolas}
                    index={activeIdx}
                    onIndexChange={setActiveIdx}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </div>
    );
}

function RelatedCard({ producto }) {
    const precioInfo = resolverPrecio(producto, 1);
    const hasOffer = precioInfo.precioFinal < precioInfo.precioBase;
    const displayPrice = precioInfo.precioFinal;

    return (
        <Link
            href={route('tienda.show', producto.id)}
            aria-label={`Ver ${producto.titulo}`}
            className="group block min-w-[78vw] max-w-[310px] flex-shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_14px_34px_-26px_rgba(28,27,27,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-[#6000ca]/20 hover:shadow-[0_24px_45px_-25px_rgba(96,0,202,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 sm:min-w-[44vw] md:min-w-0 md:max-w-none motion-reduce:transform-none"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f6f3f8]">
                {hasOffer && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-[#FF00D4] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                        Oferta
                    </span>
                )}

                {producto.imagen_principal ? (
                    <img
                        src={`/${producto.imagen_principal.ruta}`}
                        alt={producto.titulo}
                        className="h-full w-full object-contain p-5 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="flex h-20 w-20 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-4xl font-black text-[#6000ca]/20 shadow-sm">
                            {producto.titulo?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            <div className="p-5">
                <p className="mb-2 min-h-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#6000ca]">
                    {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                </p>
                <p className="line-clamp-2 min-h-11 text-base font-extrabold leading-snug text-[#1c1b1b] transition-colors group-hover:text-[#6000ca]">
                    {producto.titulo}
                </p>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-black/[0.06] pt-4">
                    <div className="min-w-0">
                        {hasOffer && (
                            <p className="text-[11px] font-medium leading-none text-[#81788a] line-through">
                                {formatPrice(producto.precio)}
                            </p>
                        )}
                        <p className={`font-black leading-none text-[#6000ca] ${hasOffer ? 'mt-1.5' : ''}`}>
                            {formatPrice(displayPrice)}
                        </p>
                    </div>

                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#6000ca]/15 bg-[#6000ca]/[0.04] text-[#6000ca] transition-colors group-hover:border-[#6000ca] group-hover:bg-[#6000ca] group-hover:text-white">
                        <ArrowIcon />
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default function ShowProduct({ producto, relacionados, canLogin }) {
    const { planesPagoTarjeta } = usePage().props;
    const [qty, setQty] = useState(() => qtyInicialDesdeUrl(producto));
    const [isFav, setIsFav] = useState(false);
    const [expandDesc, setExpandDesc] = useState(false);
    const [toast, setToast] = useState(null);
    const [planPagoId, setPlanPagoId] = useState(null);
    const { addToCart: addToCartContext, setFormaPago } = useCart();

    const variantes = producto.variantes ?? [];
    const addons = producto.addons ?? [];
    const tieneVariantes = variantes.length > 0;
    const tieneAddons = addons.length > 0;

    // Con variantes, arranca con la primera activa ya seleccionada (mismo orden que
    // pintan los swatches — ver VarianteColorSwatches) en vez de forzar un click
    // antes de mostrar precio, stock y galería reales: así la ficha abre mostrando
    // de entrada la foto/precio de esa variante en vez de la mezcla general. Si esa
    // primera variante es "a elección del cliente", el bloque de color/texto libre
    // de VarianteColorSwatches se despliega igual, sin importar si la selección fue
    // por este default o por un click explícito — ese componente solo mira
    // `value === variante.id`, no cómo se llegó ahí.
    const [varianteId, setVarianteId] = useState(() => variantes[0]?.id ?? null);
    const [addonIds, setAddonIds] = useState([]);
    const [addonTextos, setAddonTextos] = useState({});
    const [colorPersonalizado, setColorPersonalizado] = useState('');
    const [textoPersonalizado, setTextoPersonalizado] = useState('');
    // Reparto de la cantidad entre colores: `{ [varianteId]: count }`. Solo se usa
    // cuando `repartoActivo` (cantidad > 1 y 2+ colores) — ver RepartoVariantes.
    // Se siembra ya repartido para el caso de entrar con `?qty=` > 1 en la URL.
    const [asignaciones, setAsignaciones] = useState(() => {
        const qtyInicial = qtyInicialDesdeUrl(producto);
        return variantes.length > 1 && qtyInicial > 1
            ? normalizarAsignaciones({}, qtyInicial, variantes, variantes[0]?.id ?? null)
            : {};
    });

    const varianteSeleccionada = variantes.find((v) => v.id === varianteId) ?? null;
    const esColorPersonalizado = varianteSeleccionada?.es_color_personalizado ?? false;
    // Con 2+ colores y más de 1 unidad, el cliente reparte esas unidades entre
    // colores (RepartoVariantes) en vez de elegir uno solo (VarianteColorSwatches).
    const repartoActivo = tieneVariantes && variantes.length > 1 && qty > 1;

    // Se limpian apenas se deja la variante "a elección" (cambio de color o
    // deselección) para no arrastrar una descripción vieja a otro color elegido.
    useEffect(() => {
        if (!esColorPersonalizado) {
            setColorPersonalizado('');
            setTextoPersonalizado('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [varianteId]);

    // En un producto sin variantes (varianteSeleccionada siempre null acá) se
    // muestran todas las imágenes/videos, igual que siempre. Con variantes, ya hay
    // una seleccionada desde el mount (ver el useState de varianteId más arriba),
    // así que esto se resuelve contra su media propia desde el primer render y cae
    // a la general si no tiene — nunca se mezcla con la de otro color (ver
    // resolverMediaParaVariante).
    const mediaVariante = useMemo(
        () => (varianteSeleccionada ? resolverMediaParaVariante(producto.imagenes, producto.videos, varianteSeleccionada.id) : null),
        [producto.imagenes, producto.videos, varianteSeleccionada]
    );
    const galeriaImagenes = mediaVariante ? mediaVariante.imagenes : producto.imagenes;
    const galeriaVideos = mediaVariante ? (mediaVariante.video ? [mediaVariante.video] : []) : producto.videos;

    // Producto totalmente agotado: sin variantes, mira el stock propio (como siempre);
    // con variantes, solo si TODAS las activas están sin stock — mientras quede al
    // menos una disponible, el panel de compra sigue mostrándose para poder elegirla.
    const agotado = tieneVariantes
        ? variantes.every((v) => v.stock !== null && v.stock !== undefined && v.stock <= 0)
        : sinStock(producto);
    // Badge "¡Última unidad!" / "Quedan pocas": mira el color seleccionado. En modo
    // reparto no aplica (el cliente ve el stock por color en el propio repartidor).
    const stockBajo = !repartoActivo && (varianteSeleccionada
        ? tieneStockBajo(producto, varianteSeleccionada.id)
        : (!tieneVariantes && tieneStockBajo(producto)));
    const maxQty = varianteSeleccionada
        ? cantidadMaxima(producto, varianteSeleccionada.id)
        : (tieneVariantes ? null : cantidadMaxima(producto));
    // Tope real del selector de cantidad: con variantes, la SUMA del stock de todos
    // los colores (el cliente puede repartir la cantidad entre varios), no el de uno.
    const topeCantidad = tieneVariantes
        ? cantidadMaximaTotalVariantes(producto)
        : cantidadMaxima(producto);

    // En modo reparto el recargo de color se muestra por fila (RepartoVariantes), no
    // en el desglose de arriba: por eso acá se resuelve el precio sin variante.
    const precioInfo = useMemo(
        () => resolverPrecio(producto, qty, repartoActivo ? null : varianteId, addonIds),
        [producto, qty, varianteId, addonIds, repartoActivo]
    );
    const tieneDescuento = precioInfo.precioFinal < precioInfo.precioBase;
    const ahorroPorcentaje = Math.round(precioInfo.ahorroTotalPorcentaje);
    const tieneOpciones = precioInfo.recargoVariante > 0 || precioInfo.addonsTotal > 0;

    // Unidades ya repartidas y precio unitario "sin color" (escala + oferta + add-ons),
    // para RepartoVariantes y para el total de la ficha en modo reparto.
    const sumAsignado = variantes.reduce((suma, v) => suma + (asignaciones[v.id] ?? 0), 0);
    const repartoIncompleto = repartoActivo && sumAsignado !== qty;
    const precioBaseUnitario = redondear2(precioInfo.precioFinal + precioInfo.addonsTotal);

    // Simulador de recargo por tarjeta: toggle (clickear el plan ya elegido lo
    // deselecciona). Corre sobre el total de ESTE producto (precio final por unidad,
    // ya con variante/add-ons, multiplicado por la cantidad elegida) — no sobre el
    // total del carrito, eso se simula recién en el paso de Carrito/Checkout.
    const planesPagoActivos = planesPagoTarjeta ?? [];
    const planPagoSeleccionado = planesPagoActivos.find((p) => p.id === planPagoId) ?? null;
    const totalProductoActual = useMemo(() => {
        if (repartoActivo) {
            return redondear2(
                variantes.reduce((suma, v) => {
                    const count = asignaciones[v.id] ?? 0;
                    return suma + count * (precioBaseUnitario + Number(v.precio_adicional ?? 0));
                }, 0)
            );
        }
        return redondear2(precioInfo.precioFinalConOpciones * qty);
    }, [repartoActivo, variantes, asignaciones, precioBaseUnitario, precioInfo.precioFinalConOpciones, qty]);
    const recargoInfo = useMemo(
        () => (planPagoSeleccionado ? calcularRecargoPago(totalProductoActual, planPagoSeleccionado) : null),
        [planPagoSeleccionado, totalProductoActual]
    );
    // Además de la simulación local (recargoInfo, sobre el total de este producto),
    // deja/quita la forma de pago sugerida para todo el pedido (CartContext) — la
    // lee el carrito y el checkout para el total final (paso 4), y el cliente la
    // puede cambiar después. Un click en otro producto con otro plan reemplaza la
    // sugerencia anterior, no se acumulan planes de productos distintos.
    const togglePlanPago = (id) => {
        setPlanPagoId((prev) => {
            const deseleccionando = prev === id;
            if (deseleccionando) {
                setFormaPago(null);
                return null;
            }
            const plan = planesPagoActivos.find((p) => p.id === id) ?? null;
            setFormaPago(plan);
            return id;
        });
    };

    // Reclampea qty si no hay stock (entre todos los colores) para la cantidad tildada.
    useEffect(() => {
        if (topeCantidad !== null && qty > topeCantidad) {
            setQty(Math.max(1, topeCantidad));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topeCantidad]);

    // Red de seguridad: mantiene el reparto en sync con la cantidad. En el flujo
    // normal `cambiarQty` ya lo deja normalizado en el mismo batch (sin parpadeo);
    // esto solo actúa en casos borde (reclampeo por stock, cambio de props).
    useEffect(() => {
        if (!repartoActivo) {
            setAsignaciones((prev) => (Object.keys(prev).length ? {} : prev));
            return;
        }
        setAsignaciones((prev) => {
            const suma = variantes.reduce((s, v) => s + (prev[v.id] ?? 0), 0);
            return suma === qty ? prev : normalizarAsignaciones(prev, qty, variantes, varianteId);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qty, repartoActivo]);

    const setAsignacionColor = (varianteIdColor, count) => {
        setAsignaciones((prev) => {
            const variante = variantes.find((v) => v.id === varianteIdColor);
            if (!variante) return prev;
            const otros = variantes.reduce(
                (suma, v) => suma + (v.id === varianteIdColor ? 0 : (prev[v.id] ?? 0)),
                0
            );
            const nuevo = Math.max(0, Math.min(count, topeStockVariante(variante), qty - otros));
            const next = { ...prev };
            if (nuevo === 0) delete next[varianteIdColor];
            else next[varianteIdColor] = nuevo;
            return next;
        });
    };

    const toggleAddon = (addonId) => {
        setAddonIds((prev) =>
            prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
        );
    };

    const cambiarTextoAddon = (addonId, valor) => {
        setAddonTextos((prev) => ({ ...prev, [addonId]: valor }));
    };

    // Todo addon tildado que requiere texto necesita ese texto cargado; si no,
    // "Agregar al carrito" queda deshabilitado (ver ProductoAddonsChecklist).
    const addonsValidos = addonIds.every((id) => {
        const addon = addons.find((a) => a.id === id);
        if (!addon || !addon.requiere_texto) return true;
        return (addonTextos[id] ?? '').trim().length > 0;
    });

    // Con el default de arriba (primera variante preseleccionada), esto en la práctica
    // ya no se dispara para variantes normales — queda como resguardo por si en el
    // futuro se agrega una forma de deseleccionar.
    const faltaElegirVariante = tieneVariantes && varianteSeleccionada === null;
    // La variante "a elección del cliente" necesita al menos el color libre o la
    // descripción cargados (ver VarianteColorSwatches, que muestra el mensaje).
    const faltaCompletarColorPersonalizado = esColorPersonalizado
        && colorPersonalizado.trim() === ''
        && textoPersonalizado.trim() === '';
    // En modo reparto: la variante "a elección" con unidades asignadas necesita su
    // descripción, igual que en el flujo de un solo color.
    const personalizadaEnReparto = repartoActivo
        && variantes.some((v) => v.es_color_personalizado && (asignaciones[v.id] ?? 0) > 0);
    const faltaColorPersonalizadoReparto = personalizadaEnReparto
        && colorPersonalizado.trim() === ''
        && textoPersonalizado.trim() === '';
    // topeCantidad === 0 cubre el caso borde de que se haya quedado todo sin stock.
    const puedeAgregar = !agotado
        && topeCantidad !== 0
        && addonsValidos
        && (repartoActivo
            ? !repartoIncompleto && !faltaColorPersonalizadoReparto
            : !faltaElegirVariante && !faltaCompletarColorPersonalizado);

    const cambiarQty = (valor) => {
        const clamped = Math.max(1, valor);
        const nuevoQty = topeCantidad === null ? clamped : Math.min(clamped, topeCantidad);
        setQty(nuevoQty);
        // Re-reparte en el mismo batch que el cambio de cantidad para que no haya un
        // frame con "faltan N" antes de que la red de seguridad (useEffect) corrija.
        if (tieneVariantes && variantes.length > 1) {
            setAsignaciones((prev) =>
                nuevoQty > 1 ? normalizarAsignaciones(prev, nuevoQty, variantes, varianteId) : {}
            );
        }
    };

    const addToCart = () => {
        if (!puedeAgregar) return;

        // Shape acordado para la Fase siguiente (CartContext todavía no lo persiste,
        // pero ya viaja armado): varianteId + snapshot de nombre/color_hex/precio_adicional,
        // y cada addon elegido con id/nombre/precio/texto_personalizado.
        const addonsSeleccionados = addonIds.map((id) => {
            const addon = addons.find((a) => a.id === id);
            const overridePrecio = addon.pivot?.precio_override;
            const precio = overridePrecio !== null && overridePrecio !== undefined
                ? Number(overridePrecio)
                : Number(addon.precio);

            return {
                addon_id: addon.id,
                nombre: addon.nombre,
                precio,
                texto_personalizado: addon.requiere_texto ? (addonTextos[id] ?? '').trim() : null,
            };
        });

        // Combina lo que el cliente cargó para el color "a elección" en un solo texto
        // (ver migración pedido_items.color_personalizado_texto, que guarda un único
        // campo): si escribió una descripción y también eligió un color de referencia,
        // se guardan los dos juntos; si solo cargó uno de los dos, se usa ese.
        const construirColorPersonalizadoTexto = () => {
            const descripcionColor = textoPersonalizado.trim();
            const hexColor = colorPersonalizado.trim();
            return descripcionColor && hexColor
                ? `${descripcionColor} (${hexColor})`
                : descripcionColor || hexColor || null;
        };

        const snapshotVariante = (v) => ({
            id: v.id,
            nombre: v.nombre,
            color_hex: v.color_hex,
            precio_adicional: Number(v.precio_adicional),
        });

        if (repartoActivo) {
            // Una línea de carrito por color asignado. El precio por cantidad se
            // resuelve después sobre la suma de todas (ver CartContext.cantidadPorProducto).
            variantes.forEach((v) => {
                const count = asignaciones[v.id] ?? 0;
                if (count <= 0) return;
                addToCartContext(producto, count, {
                    varianteId: v.id,
                    variante: snapshotVariante(v),
                    addons: addonsSeleccionados,
                    colorPersonalizadoTexto: v.es_color_personalizado ? construirColorPersonalizadoTexto() : null,
                });
            });
        } else {
            addToCartContext(producto, qty, {
                varianteId: varianteSeleccionada?.id ?? null,
                variante: varianteSeleccionada && snapshotVariante(varianteSeleccionada),
                addons: addonsSeleccionados,
                colorPersonalizadoTexto: esColorPersonalizado ? construirColorPersonalizadoTexto() : null,
            });
        }

        if (toast) clearTimeout(window._toastTimer);
        setToast(`${producto.titulo} agregado al carrito`);
        window._toastTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div className="min-h-screen overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title={producto.titulo} />
            <LandingHeader canLogin={canLogin} />

            <main className="relative pb-28 md:pb-20">
                <div className="pointer-events-none absolute left-[-12rem] top-16 h-[28rem] w-[28rem] rounded-full bg-[#6000ca]/[0.035] blur-3xl" />
                <div className="pointer-events-none absolute right-[-10rem] top-[32rem] h-[24rem] w-[24rem] rounded-full bg-[#FF00D4]/[0.025] blur-3xl" />

                <nav
                    aria-label="Migas de pan"
                    className="relative hidden w-full flex-wrap items-center gap-2 px-3 py-6 text-xs font-semibold text-[#81788a] sm:px-4 md:flex"
                >
                    <Link
                        href="/"
                        className="rounded-md transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                    >
                        Inicio
                    </Link>
                    <ArrowIcon className="h-3 w-3 text-[#b8afc0]" />
                    <Link
                        href={route('tienda.index')}
                        className="rounded-md transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                    >
                        Catálogo
                    </Link>
                    {producto.categorias?.[0] && (
                        <>
                            <ArrowIcon className="h-3 w-3 text-[#b8afc0]" />
                            <Link
                                href={route('tienda.index', { categoria: producto.categorias[0].id })}
                                className="rounded-md transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                            >
                                {producto.categorias[0].nombre}
                            </Link>
                        </>
                    )}
                    <ArrowIcon className="h-3 w-3 text-[#b8afc0]" />
                    <span className="max-w-xs truncate font-extrabold text-[#1c1b1b]">{producto.titulo}</span>
                </nav>

                <section className="relative w-full px-3 pt-3 sm:px-4 md:pt-0">
                    <div className="grid items-start gap-2 rounded-[2rem] border border-black/[0.06] bg-white p-2 shadow-[0_30px_70px_-48px_rgba(28,27,27,0.5)] sm:gap-4 sm:rounded-[2.5rem] sm:p-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-6 lg:p-4">
                        <ProductGallery imagenes={galeriaImagenes} videos={galeriaVideos} titulo={producto.titulo} />

                        <div className="px-3 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-5 lg:px-5 lg:py-6 xl:px-8 xl:py-8">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                        {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {agotado && (
                                            <span className="rounded-full bg-[#ba1a1a] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-red-500/20">
                                                Sin stock
                                            </span>
                                        )}
                                        {stockBajo && (
                                            <span className="rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-900 shadow-lg">
                                                {maxQty === 1 ? '¡Última unidad!' : `Quedan pocas: ${maxQty}`}
                                            </span>
                                        )}
                                        {tieneDescuento && (
                                            <span className="rounded-full bg-[#FF00D4] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                                                {ahorroPorcentaje}% off
                                            </span>
                                        )}
                                        {!tieneDescuento && producto.is_featured && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6000ca]/10 bg-[#6000ca]/[0.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6000ca]">
                                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12l-2.8-2.03c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" />
                                                </svg>
                                                Destacado
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsFav(!isFav)}
                                    aria-label={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                    aria-pressed={isFav}
                                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 ${
                                        isFav
                                            ? 'border-[#FF00D4]/20 bg-[#FF00D4]/[0.08] text-[#FF00D4]'
                                            : 'border-black/[0.07] bg-white text-[#81788a] hover:border-[#FF00D4]/25 hover:bg-[#FF00D4]/[0.05] hover:text-[#FF00D4]'
                                    }`}
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill={isFav ? 'currentColor' : 'none'}
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>
                            </div>

                            <h1 className="text-[clamp(2rem,8vw,3.15rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#1c1b1b] lg:text-[clamp(2.35rem,4vw,3.7rem)]">
                                {producto.titulo}
                            </h1>

                            <div className="mt-6 rounded-[1.5rem] border border-[#6000ca]/[0.08] bg-[#f7f4fa] p-5 sm:p-6">
                                {planesPagoActivos.length > 0 && (
                                    <div className="mb-4 border-b border-[#6000ca]/10 pb-4">
                                        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                                            Simulá el pago con tarjeta
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {planesPagoActivos.map((plan) => {
                                                const activo = plan.id === planPagoId;
                                                return (
                                                    <button
                                                        key={plan.id}
                                                        type="button"
                                                        onClick={() => togglePlanPago(plan.id)}
                                                        aria-pressed={activo}
                                                        className={`rounded-full border px-3.5 py-2 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
                                                            activo
                                                                ? 'border-[#6000ca] bg-[#6000ca] text-white'
                                                                : 'border-[#6000ca]/20 bg-white text-[#6000ca] hover:border-[#6000ca]/40'
                                                        }`}
                                                    >
                                                        {plan.cuotas === 1 ? '1 cuota' : `${plan.cuotas} cuotas`}
                                                        {Number(plan.recargo_porcentaje) > 0 && ` +${formatPercent(plan.recargo_porcentaje)}`}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {recargoInfo && planPagoSeleccionado && (
                                            <p className="mt-3 text-xs font-semibold text-[#4b4356]">
                                                Total: {formatPrice(recargoInfo.total_con_recargo)} —{' '}
                                                {planPagoSeleccionado.cuotas === 1
                                                    ? `1 cuota de ${formatPrice(recargoInfo.monto_por_cuota)}`
                                                    : `${planPagoSeleccionado.cuotas} cuotas de ${formatPrice(recargoInfo.monto_por_cuota)} c/u`}
                                                {recargoInfo.recargo_monto > 0 && ` (recargo ${formatPrice(recargoInfo.recargo_monto)} incluido)`}
                                            </p>
                                        )}

                                        <p className="mt-2 text-[11px] font-medium text-[#81788a]">
                                            Esta simulación es sobre este producto puntual. El recargo real del pedido se calcula sobre el total completo de tu compra al momento de pagar.
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                                    <span className="text-[clamp(2.25rem,10vw,3.25rem)] font-black leading-none tracking-[-0.045em] text-[#6000ca]">
                                        {formatPrice(precioInfo.precioFinal)}
                                    </span>
                                    {tieneDescuento && (
                                        <span className="pb-1 text-sm font-semibold text-[#81788a] line-through">
                                            {formatPrice(precioInfo.precioBase)}
                                        </span>
                                    )}
                                    {tieneDescuento && (
                                        <span className="pb-1 text-xs font-extrabold uppercase tracking-wide text-[#6000ca]">
                                            Ahorrás {ahorroPorcentaje}%
                                        </span>
                                    )}
                                </div>
                                {!agotado && (
                                    <p className="mt-1 text-xs font-semibold text-[#81788a]">
                                        {repartoActivo
                                            ? `Precio base por unidad para ${qty} unidades — el recargo de cada color se suma abajo`
                                            : `Precio unitario para ${qty} ${qty === 1 ? 'unidad' : 'unidades'}`}
                                    </p>
                                )}

                                {tieneOpciones && (
                                    <div className="mt-4 space-y-1.5 border-t border-[#6000ca]/10 pt-4 text-xs font-semibold text-[#4b4356]">
                                        <div className="flex items-center justify-between">
                                            <span>Precio base</span>
                                            <span>{formatPrice(precioInfo.precioFinal)}</span>
                                        </div>
                                        {precioInfo.recargoVariante > 0 && (
                                            <div className="flex items-center justify-between">
                                                <span>Color {varianteSeleccionada?.nombre}</span>
                                                <span>+ {formatPrice(precioInfo.recargoVariante)}</span>
                                            </div>
                                        )}
                                        {precioInfo.addonsTotal > 0 && (
                                            <div className="flex items-center justify-between">
                                                <span>Personalizaciones</span>
                                                <span>+ {formatPrice(precioInfo.addonsTotal)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between border-t border-[#6000ca]/10 pt-1.5 text-sm font-black text-[#1c1b1b]">
                                            <span>{repartoActivo ? 'Por unidad (sin color)' : 'Total por unidad'}</span>
                                            <span>{formatPrice(precioInfo.precioFinalConOpciones)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {producto.descripcion && (
                                <div className="mt-6 border-t border-black/[0.06] pt-5">
                                    <h2 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                        Sobre este producto
                                    </h2>
                                    <div
                                        className={`quill-content text-sm font-medium leading-relaxed text-[#4b4356] md:text-[15px] ${!expandDesc ? 'line-clamp-4 md:line-clamp-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: producto.descripcion }}
                                    />
                                    {!expandDesc && (
                                        <button
                                            type="button"
                                            onClick={() => setExpandDesc(true)}
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-extrabold text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 md:hidden"
                                        >
                                            Ver descripción completa
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            {agotado ? (
                                <div className="mt-6 rounded-[1.5rem] border border-red-100 bg-red-50 p-5 text-center sm:p-6">
                                    <p className="text-sm font-extrabold uppercase tracking-wide text-[#ba1a1a]">
                                        Sin stock
                                    </p>
                                    <p className="mt-1.5 text-sm font-medium text-[#ba1a1a]/80">
                                        Este producto no tiene unidades disponibles en este momento.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {(tieneVariantes || tieneAddons) && (
                                        <div className="mt-6 rounded-[1.5rem] border border-black/[0.05] bg-white p-4 sm:p-5">
                                            {repartoActivo ? (
                                                <RepartoVariantes
                                                    variantes={variantes}
                                                    qty={qty}
                                                    asignaciones={asignaciones}
                                                    onChange={setAsignacionColor}
                                                    precioBaseUnitario={precioBaseUnitario}
                                                    colorPersonalizado={colorPersonalizado}
                                                    textoPersonalizado={textoPersonalizado}
                                                    onColorPersonalizadoChange={setColorPersonalizado}
                                                    onTextoPersonalizadoChange={setTextoPersonalizado}
                                                />
                                            ) : (
                                                <VarianteColorSwatches
                                                    variantes={variantes}
                                                    value={varianteId}
                                                    onChange={setVarianteId}
                                                    colorPersonalizado={colorPersonalizado}
                                                    textoPersonalizado={textoPersonalizado}
                                                    onColorPersonalizadoChange={setColorPersonalizado}
                                                    onTextoPersonalizadoChange={setTextoPersonalizado}
                                                />
                                            )}
                                            <ProductoAddonsChecklist
                                                addons={addons}
                                                seleccionados={addonIds}
                                                textos={addonTextos}
                                                onToggle={toggleAddon}
                                                onTextoChange={cambiarTextoAddon}
                                            />
                                        </div>
                                    )}

                                    <div className="mt-6 rounded-[1.5rem] border border-black/[0.05] bg-[#f7f6f9] p-4 sm:p-5">
                                        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                                            Elegí la cantidad
                                        </p>

                                        <PillsCantidad producto={producto} qty={qty} onChange={cambiarQty} className="mb-3" />

                                        {qty > 1 && (
                                            <div className="mb-3 rounded-2xl border border-[#6000ca]/[0.12] bg-white px-4 py-3">
                                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#81788a]">
                                                    {repartoActivo && repartoIncompleto
                                                        ? `Total (${sumAsignado} de ${qty} asignadas)`
                                                        : `Total por ${qty} unidades`}
                                                </p>
                                                <p className="text-xl font-black leading-tight text-[#6000ca]">
                                                    {formatPrice(totalProductoActual)}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-semibold text-[#81788a]">
                                                    {repartoActivo
                                                        ? `${qty} unidades repartidas entre colores`
                                                        : `${formatPrice(precioInfo.precioFinalConOpciones)} cada una`}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <div className="flex h-14 w-full items-center justify-between rounded-full border border-black/[0.08] bg-white px-1 shadow-sm sm:w-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarQty(qty - 1)}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold leading-none text-[#6000ca] transition-colors hover:bg-[#6000ca]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-95"
                                                    aria-label="Reducir cantidad"
                                                >
                                                    −
                                                </button>
                                                <span className="min-w-10 select-none text-center text-base font-black text-[#1c1b1b]">
                                                    {qty}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarQty(qty + 1)}
                                                    disabled={topeCantidad !== null && qty >= topeCantidad}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold leading-none text-[#6000ca] transition-colors hover:bg-[#6000ca]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                                                    aria-label="Aumentar cantidad"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addToCart}
                                                disabled={!puedeAgregar}
                                                className="flex h-16 w-full items-center justify-center gap-2.5 rounded-full bg-[#6000ca] px-6 text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_12px_25px_-12px_rgba(96,0,202,0.8)] transition-all hover:bg-[#4f00a8] hover:shadow-[0_16px_30px_-12px_rgba(96,0,202,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-[#81788a] disabled:shadow-none motion-reduce:transform-none sm:h-14 sm:flex-1"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25h10.5l.75 12H6l.75-12z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V6.75a3 3 0 016 0V9" />
                                                </svg>
                                                Añadir al carrito
                                            </button>
                                        </div>
                                        {faltaElegirVariante && (
                                            <p className="mt-3 text-center text-[11px] font-bold text-[#ba1a1a] sm:text-left">
                                                Elegí un color para poder agregarlo al carrito.
                                            </p>
                                        )}
                                        {repartoIncompleto && (
                                            <p className="mt-3 text-center text-[11px] font-bold text-[#ba1a1a] sm:text-left">
                                                Repartí las {qty} unidades entre los colores de arriba para continuar.
                                            </p>
                                        )}
                                        {!faltaElegirVariante && !repartoIncompleto && topeCantidad !== null && (
                                            <p className="mt-3 text-center text-[11px] font-semibold text-[#81788a] sm:text-left">
                                                Quedan {topeCantidad} {topeCantidad === 1 ? 'unidad' : 'unidades'} disponibles{repartoActivo ? ' entre todos los colores' : ''}.
                                            </p>
                                        )}
                                    </div>

                                    <TablaPreciosPorCantidad producto={producto} qty={qty} />
                                </>
                            )}

                            {producto.categorias?.length > 0 && (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {producto.categorias.map((cat) => (
                                        <Link
                                            key={cat.id}
                                            href={route('tienda.index', { categoria: cat.id })}
                                            className="rounded-full border border-[#6000ca]/10 bg-[#6000ca]/[0.05] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6000ca] transition-colors hover:border-[#6000ca]/20 hover:bg-[#6000ca]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                                        >
                                            {cat.nombre}
                                        </Link>
                                    ))}
                                    {producto.subcategorias?.map((sub) => (
                                        <span
                                            key={sub.id}
                                            className="rounded-full border border-black/[0.06] bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#4b4356]"
                                        >
                                            {sub.nombre}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {relacionados?.length > 0 && (
                    <section className="relative mt-16 w-full md:mt-24 md:px-4">
                        <div className="mb-7 flex items-end justify-between gap-5 px-4 md:px-0">
                            <div className="max-w-3xl">
                                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6000ca]">
                                    Seguí descubriendo
                                </p>
                                <h2 className="text-[clamp(1.75rem,7vw,3.5rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] text-[#1c1b1b]">
                                    Productos <span className="text-[#6000ca]">relacionados</span>
                                </h2>
                            </div>
                            <Link
                                href={route('tienda.index')}
                                className="hidden h-12 items-center gap-2 rounded-full border-2 border-[#6000ca] bg-white px-5 text-xs font-extrabold uppercase tracking-[0.07em] text-[#6000ca] transition-all hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-95 sm:inline-flex"
                            >
                                Ver catálogo
                                <ArrowIcon />
                            </Link>
                        </div>

                        <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:hidden">
                            {relacionados.map((prod) => (
                                <RelatedCard key={prod.id} producto={prod} />
                            ))}
                        </div>

                        <div className="hidden grid-cols-3 gap-5 md:grid lg:grid-cols-4 lg:gap-6">
                            {relacionados.map((prod) => (
                                <RelatedCard key={prod.id} producto={prod} />
                            ))}
                        </div>

                        <div className="mt-5 px-4 sm:hidden">
                            <Link
                                href={route('tienda.index')}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#6000ca] bg-white text-xs font-extrabold uppercase tracking-[0.07em] text-[#6000ca] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98]"
                            >
                                Ver catálogo
                                <ArrowIcon />
                            </Link>
                        </div>
                    </section>
                )}

                <section className="relative mt-16 w-full px-3 sm:px-4 md:mt-24">
                    <div className="relative overflow-hidden rounded-[2rem] bg-[#6000ca] px-6 py-10 shadow-[0_28px_60px_-35px_rgba(96,0,202,0.85)] sm:px-9 sm:py-12 md:rounded-[2.5rem] md:px-14 md:py-16 lg:px-16">
                        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border-[64px] border-white/[0.055]" />
                        <div className="pointer-events-none absolute -bottom-28 right-36 h-64 w-64 rounded-full bg-[#FF00D4]/20 blur-3xl" />
                        <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block" aria-hidden="true">
                            <svg className="h-44 w-44 text-white/[0.08]" viewBox="0 0 100 100" fill="currentColor">
                                <path d="M50 2l9.3 32.7L92 44l-32.7 9.3L50 86l-9.3-32.7L8 44l32.7-9.3L50 2z" />
                            </svg>
                        </div>

                        <div className="relative z-10 max-w-3xl">
                            <span className="mb-3 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ffd8ed]">
                                Tecnología de vanguardia
                            </span>
                            <h2 className="max-w-2xl text-[clamp(2rem,8vw,4.15rem)] font-black uppercase leading-[0.94] tracking-[-0.045em] text-white">
                                Dominá el escenario con efectos Chisperío
                            </h2>
                            <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/75 md:text-base">
                                Nuestras máquinas están diseñadas para ofrecer un rendimiento impecable bajo las condiciones más exigentes. Seguridad certificada y efectos visuales de alto impacto.
                            </p>
                            <Link
                                href={route('tienda.index')}
                                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.07em] text-[#6000ca] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[#fcf9f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#6000ca] active:scale-95 motion-reduce:transform-none"
                            >
                                Ver catálogo completo
                                <ArrowIcon />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <LandingFooter />

            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-[#1c1b1b] px-5 py-3 text-xs font-semibold text-white shadow-2xl md:bottom-8 md:text-sm"
                >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#FF00D4]" aria-hidden="true">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </span>
                    <span className="truncate">{toast}</span>
                </div>
            )}
        </div>
    );
}
