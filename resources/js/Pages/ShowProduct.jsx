import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import BackToCatalog from '@/Components/BackToCatalog';
import LandingFooter from '@/Components/Landing/LandingFooter';
import PillsCantidad from '@/Components/PillsCantidad';
import ProductImageLightbox from '@/Components/ProductImageLightbox';
import StickyGallery from '@/Components/StickyGallery';
import ResenasConfianza from '@/Components/ResenasConfianza';
import VarianteColorSwatches, { GRADIENTE_PERSONALIZADO } from '@/Components/VarianteColorSwatches';
import RepartoVariantes from '@/Components/RepartoVariantes';
import ProductoAddonsChecklist from '@/Components/ProductoAddonsChecklist';
import {
    ProductAttributes,
    ProductDeliveryInfo,
    ProductPaymentOptions,
    ProductSellerInfo,
} from '@/Components/ProductDetailSections';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/Context/CartContext';
import { redondear2, resolverPrecio } from '@/lib/pricing';
import { calcular as calcularRecargoPago } from '@/lib/recargoPago';
import { resolverMediaParaVariante } from '@/lib/media';
import { cantidadMaxima, cantidadMaximaTotalVariantes, capearCantidad, sinStock, tieneStockBajo } from '@/lib/stock';
import { track, itemEventParams } from '@/lib/pixel';

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
            className={`group/thumb relative aspect-square w-16 flex-shrink-0 overflow-hidden rounded-md border bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
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
                    className="h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover/thumb:scale-105 motion-reduce:transition-none"
                />
            )}
            {i === activeIdx && <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[#6000ca]" />}
        </button>
    );
}

function ProductGallery({ imagenes, videos, titulo }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const stripRef = useRef(null);

    // Al cambiar de color el set de imágenes/video puede ser otro (ver
    // resolverMediaParaVariante en ShowProduct); sin este reset, activeIdx podía
    // quedar apuntando a un índice de la selección anterior que ya no corresponde.
    useEffect(() => {
        setActiveIdx(0);
        stripRef.current?.scrollTo({ left: 0, behavior: 'auto' });
    }, [imagenes, videos]);

    const items = useMemo(
        () => [
            ...(imagenes ?? []).map((item) => ({ ...item, kind: 'imagen' })),
            ...(videos ?? []).map((item) => ({ ...item, kind: 'video' })),
        ],
        [imagenes, videos],
    );

    // La galería es un carrusel con scroll-snap (mismo enfoque que el hero de la home): en mobile
    // se desliza con el dedo. activeIdx se deriva del scroll; goTo (miniaturas, puntos,
    // lightbox) hace el camino inverso, llevando el carrusel hasta esa posición.
    const goTo = useCallback((i) => {
        setActiveIdx(i);
        const strip = stripRef.current;
        if (strip) strip.scrollTo({ left: strip.clientWidth * i, behavior: 'smooth' });
    }, []);

    const handleScroll = () => {
        const strip = stripRef.current;
        if (!strip || !strip.clientWidth) return;
        const i = Math.round(strip.scrollLeft / strip.clientWidth);
        setActiveIdx((prev) => (prev === i ? prev : i));
    };

    // Al deslizar a otra slide, un video que estaba reproduciéndose se pausa.
    useEffect(() => {
        stripRef.current?.querySelectorAll('video').forEach((video) => {
            if (Number(video.dataset.idx) !== activeIdx) video.pause();
        });
    }, [activeIdx]);

    if (items.length === 0) {
        return (
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-white">
                <span className="relative flex h-36 w-36 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-7xl font-black text-[#6000ca]/20 shadow-[0_18px_50px_-30px_rgba(96,0,202,0.45)] sm:h-44 sm:w-44 sm:text-8xl">
                    {titulo?.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    // Las imágenes ocupan siempre los primeros índices de `items` (se arman antes que
    // los videos), así que mientras el activo sea una imagen, su índice acá es
    // directamente el mismo que necesita el lightbox (que solo conoce imágenes).
    const imagenesSolas = items.filter((item) => item.kind === 'imagen');

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="group relative aspect-square w-full overflow-hidden bg-white">
                <span
                    className="pointer-events-none absolute left-4 top-3 z-10 rounded-full bg-[#f5f5f5] px-2.5 py-1 text-xs text-[#1c1b1b]"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {activeIdx + 1} / {items.length}
                </span>

                <div
                    ref={stripRef}
                    onScroll={handleScroll}
                    className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto md:overflow-x-hidden"
                >
                    {items.map((item, i) => (
                        <div
                            key={`${item.kind}-${item.id ?? i}`}
                            className="h-full w-full flex-shrink-0 snap-center snap-always"
                        >
                            {item.kind === 'video' ? (
                                <video
                                    data-idx={i}
                                    src={`/${item.ruta}`}
                                    controls
                                    playsInline
                                    preload="metadata"
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
                                        src={`/${item.ruta}`}
                                        alt={titulo}
                                        loading={i === 0 ? 'eager' : 'lazy'}
                                        draggable={false}
                                        className="relative h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.015] sm:p-5 lg:p-6 motion-reduce:transition-none"
                                    />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {items.length > 1 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4 md:hidden">
                        <div className="flex max-w-full items-center overflow-x-auto rounded-full bg-white/90 px-1.5">
                            {items.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => goTo(i)}
                                    aria-label={`Ver ${items[i].kind === 'video' ? 'video' : 'imagen'} ${i + 1} de ${items.length}`}
                                    aria-pressed={i === activeIdx}
                                    className="flex h-10 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                                >
                                    <span
                                        className={`block rounded-full transition-all duration-200 ${
                                            i === activeIdx ? 'h-2 w-2 bg-[#6000ca]' : 'h-2 w-2 bg-[#b9afc3]'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <div className="hidden gap-3 overflow-x-auto p-1 md:flex">
                    {items.map((item, i) => (
                        <GalleryThumb
                            key={i}
                            item={item}
                            i={i}
                            total={items.length}
                            activeIdx={activeIdx}
                            onSelect={goTo}
                        />
                    ))}
                </div>
            )}

            {lightboxOpen && (
                <ProductImageLightbox
                    images={imagenesSolas}
                    index={activeIdx}
                    onIndexChange={goTo}
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
    const variantes = producto.variantes_activas ?? [];
    const [varianteId, setVarianteId] = useState(null);
    const variante = variantes.find((v) => v.id === varianteId) ?? null;

    // Al elegir un color se previsualiza su foto (si tiene propia); si no, queda la principal.
    const imagenRuta = variante?.media_especifica?.[0]?.ruta ?? producto.imagen_principal?.ruta ?? null;
    const href = route('tienda.show', variante ? { producto: producto.id, variante: variante.id } : producto.id);

    return (
        <article className="group block w-[46vw] max-w-[240px] flex-shrink-0 snap-start overflow-hidden rounded-lg border border-black/10 bg-white transition-colors hover:border-[#6000ca]/30 sm:w-[220px] md:w-auto md:max-w-none">
            <Link
                href={href}
                aria-label={`Ver ${producto.titulo}`}
                className="relative block aspect-square overflow-hidden border-b border-black/[0.06] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
            >
                {hasOffer && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-[#FF00D4] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                        Oferta
                    </span>
                )}

                {imagenRuta ? (
                    <img
                        key={imagenRuta}
                        src={`/${imagenRuta}`}
                        alt={variante ? `${producto.titulo} — ${variante.nombre}` : producto.titulo}
                        className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="flex h-20 w-20 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-4xl font-black text-[#6000ca]/20 shadow-sm">
                            {producto.titulo?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </Link>

            <div className="p-3 sm:p-4">
                <p className="mb-2 truncate text-[10px] text-[#737373]">
                    {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                </p>

                {variantes.length > 0 && (
                    <div
                        className="mb-3 flex flex-wrap items-center gap-2"
                        role="group"
                        aria-label="Colores disponibles"
                    >
                        {variantes.map((v) => {
                            const activa = v.id === varianteId;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setVarianteId(activa ? null : v.id)}
                                    aria-label={v.nombre}
                                    aria-pressed={activa}
                                    title={v.nombre}
                                    className={`h-6 w-6 flex-shrink-0 rounded-full border-2 border-white shadow-sm ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] ${
                                        activa
                                            ? 'scale-110 ring-2 ring-[#6000ca]'
                                            : 'ring-black/15 hover:ring-[#6000ca]/50'
                                    }`}
                                    style={
                                        v.es_color_personalizado
                                            ? { background: GRADIENTE_PERSONALIZADO }
                                            : { backgroundColor: v.color_hex || '#e5e5e5' }
                                    }
                                />
                            );
                        })}
                        {variante && (
                            <span className="min-w-0 truncate text-[11px] font-bold text-[#4b4356]">
                                {variante.nombre}
                            </span>
                        )}
                    </div>
                )}

                <Link
                    href={href}
                    className="block line-clamp-2 min-h-10 text-[13px] font-medium leading-snug text-[#1c1b1b] transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                >
                    {producto.titulo}
                </Link>

                <Link
                    href={href}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="mt-3 flex items-end justify-between gap-2"
                >
                    <div className="min-w-0">
                        {hasOffer && (
                            <p className="text-[11px] font-medium leading-none text-[#81788a] line-through">
                                {formatPrice(producto.precio)}
                            </p>
                        )}
                        <p className={`text-lg font-semibold leading-none text-[#1c1b1b] ${hasOffer ? 'mt-1.5' : ''}`}>
                            {formatPrice(displayPrice)}
                        </p>
                    </div>

                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-[#6000ca]">
                        <ArrowIcon />
                    </span>
                </Link>
            </div>
        </article>
    );
}

export default function ShowProduct({ producto, relacionados, resenas = [], canLogin }) {
    const { planesPagoTarjeta, configuracionEnvio } = usePage().props;
    const [qty, setQty] = useState(() => qtyInicialDesdeUrl(producto));
    const [toast, setToast] = useState(null);
    const [planPagoId, setPlanPagoId] = useState(null);
    const { addToCart: addToCartContext, setFormaPago } = useCart();

    // Meta Pixel: una vez por producto visto (Inertia reusa este componente al ir de
    // una ficha a otra, por eso depende del id). Precio de lista unitario, sin opciones.
    useEffect(() => {
        track(
            'ViewContent',
            itemEventParams({
                id: producto.id,
                titulo: producto.titulo,
                value: resolverPrecio(producto, 1).precioFinal,
            }),
        );
    }, [producto.id]);

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
    // `?variante=<id>` (viene de las cards de productos relacionados) abre la ficha con ese color ya elegido.
    const [varianteId, setVarianteId] = useState(() => {
        const pedida =
            typeof window === 'undefined'
                ? NaN
                : parseInt(new URLSearchParams(window.location.search).get('variante'), 10);
        return variantes.find((v) => v.id === pedida)?.id ?? variantes[0]?.id ?? null;
    });
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
        () =>
            varianteSeleccionada
                ? resolverMediaParaVariante(producto.imagenes, producto.videos, varianteSeleccionada.id)
                : null,
        [producto.imagenes, producto.videos, varianteSeleccionada],
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
    const stockBajo =
        !repartoActivo &&
        (varianteSeleccionada
            ? tieneStockBajo(producto, varianteSeleccionada.id)
            : !tieneVariantes && tieneStockBajo(producto));
    const maxQty = varianteSeleccionada
        ? cantidadMaxima(producto, varianteSeleccionada.id)
        : tieneVariantes
          ? null
          : cantidadMaxima(producto);
    // Tope real del selector de cantidad: con variantes, la SUMA del stock de todos
    // los colores (el cliente puede repartir la cantidad entre varios), no el de uno.
    const topeCantidad = tieneVariantes ? cantidadMaximaTotalVariantes(producto) : cantidadMaxima(producto);

    // En modo reparto el recargo de color se muestra por fila (RepartoVariantes), no
    // en el desglose de arriba: por eso acá se resuelve el precio sin variante.
    const precioInfo = useMemo(
        () => resolverPrecio(producto, qty, repartoActivo ? null : varianteId, addonIds),
        [producto, qty, varianteId, addonIds, repartoActivo],
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
                }, 0),
            );
        }
        return redondear2(precioInfo.precioFinalConOpciones * qty);
    }, [repartoActivo, variantes, asignaciones, precioBaseUnitario, precioInfo.precioFinalConOpciones, qty]);
    const recargoInfo = useMemo(
        () => (planPagoSeleccionado ? calcularRecargoPago(totalProductoActual, planPagoSeleccionado) : null),
        [planPagoSeleccionado, totalProductoActual],
    );
    // Además de la simulación local (recargoInfo, sobre el total de este producto),
    // deja/quita la forma de pago sugerida para todo el pedido (CartContext) — la
    // lee el carrito y el checkout para el total final (paso 4), y el cliente la
    // puede cambiar después. Un click en otro producto con otro plan reemplaza la
    // sugerencia anterior, no se acumulan planes de productos distintos.
    const togglePlanPago = (id) => {
        const siguienteId = planPagoId === id ? null : id;
        setPlanPagoId(siguienteId);
        setFormaPago(planesPagoActivos.find((plan) => plan.id === siguienteId) ?? null);
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
            const otros = variantes.reduce((suma, v) => suma + (v.id === varianteIdColor ? 0 : (prev[v.id] ?? 0)), 0);
            const nuevo = Math.max(0, Math.min(count, topeStockVariante(variante), qty - otros));
            const next = { ...prev };
            if (nuevo === 0) delete next[varianteIdColor];
            else next[varianteIdColor] = nuevo;
            return next;
        });
    };

    const toggleAddon = (addonId) => {
        setAddonIds((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
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
    const faltaCompletarColorPersonalizado =
        esColorPersonalizado && colorPersonalizado.trim() === '' && textoPersonalizado.trim() === '';
    // En modo reparto: la variante "a elección" con unidades asignadas necesita su
    // descripción, igual que en el flujo de un solo color.
    const personalizadaEnReparto =
        repartoActivo && variantes.some((v) => v.es_color_personalizado && (asignaciones[v.id] ?? 0) > 0);
    const faltaColorPersonalizadoReparto =
        personalizadaEnReparto && colorPersonalizado.trim() === '' && textoPersonalizado.trim() === '';
    // topeCantidad === 0 cubre el caso borde de que se haya quedado todo sin stock.
    const puedeAgregar =
        !agotado &&
        topeCantidad !== 0 &&
        addonsValidos &&
        (repartoActivo
            ? !repartoIncompleto && !faltaColorPersonalizadoReparto
            : !faltaElegirVariante && !faltaCompletarColorPersonalizado && (maxQty === null || qty <= maxQty));

    const cambiarQty = (valor) => {
        const clamped = Math.max(1, valor);
        const nuevoQty = topeCantidad === null ? clamped : Math.min(clamped, topeCantidad);
        setQty(nuevoQty);
        // Re-reparte en el mismo batch que el cambio de cantidad para que no haya un
        // frame con "faltan N" antes de que la red de seguridad (useEffect) corrija.
        if (tieneVariantes && variantes.length > 1) {
            setAsignaciones((prev) =>
                nuevoQty > 1 ? normalizarAsignaciones(prev, nuevoQty, variantes, varianteId) : {},
            );
        }
    };

    const addToCart = (comprarAhora = false) => {
        if (!puedeAgregar) return;

        // Shape acordado para la Fase siguiente (CartContext todavía no lo persiste,
        // pero ya viaja armado): varianteId + snapshot de nombre/color_hex/precio_adicional,
        // y cada addon elegido con id/nombre/precio/texto_personalizado.
        const addonsSeleccionados = addonIds.map((id) => {
            const addon = addons.find((a) => a.id === id);
            const overridePrecio = addon.pivot?.precio_override;
            const precio =
                overridePrecio !== null && overridePrecio !== undefined ? Number(overridePrecio) : Number(addon.precio);

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
                    skipTrack: true,
                });
            });
            // Un solo AddToCart por click con el total repartido (en vez de uno por color).
            track(
                'AddToCart',
                itemEventParams({
                    id: producto.id,
                    titulo: producto.titulo,
                    value: totalProductoActual,
                    cantidad: sumAsignado,
                }),
            );
        } else {
            addToCartContext(producto, qty, {
                varianteId: varianteSeleccionada?.id ?? null,
                variante: varianteSeleccionada && snapshotVariante(varianteSeleccionada),
                addons: addonsSeleccionados,
                colorPersonalizadoTexto: esColorPersonalizado ? construirColorPersonalizadoTexto() : null,
            });
        }

        if (comprarAhora) {
            router.visit(route('checkout.index'));
            return;
        }

        if (toast) clearTimeout(window._toastTimer);
        setToast(`${producto.titulo} agregado al carrito`);
        window._toastTimer = setTimeout(() => setToast(null), 2500);
    };

    const selectorColor = repartoActivo ? (
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
    );

    return (
        <div className="min-h-screen overflow-x-clip bg-white text-[#1c1b1b] antialiased lg:bg-[#f5f5f5]">
            <Head title={producto.titulo} />
            <LandingHeader canLogin={canLogin} />
            <main className="mx-auto w-full max-w-[1200px] pb-24 lg:px-6 lg:pb-16">
                <BackToCatalog cardKey={`p-${producto.id}`} />
                <nav
                    aria-label="Migas de pan"
                    className="hidden items-center gap-2 px-4 py-4 text-xs text-[#737373] lg:flex"
                >
                    <Link href="/" className="hover:text-[#6000ca]">
                        Inicio
                    </Link>
                    <ArrowIcon className="h-3 w-3" />
                    <Link href={route('tienda.index')} className="hover:text-[#6000ca]">
                        Catálogo
                    </Link>
                    {producto.categorias?.[0] && (
                        <>
                            <ArrowIcon className="h-3 w-3" />
                            <Link
                                href={route('tienda.index', { categoria: producto.categorias[0].id })}
                                className="hover:text-[#6000ca]"
                            >
                                {producto.categorias[0].nombre}
                            </Link>
                        </>
                    )}
                </nav>
                <div className="mt-4 bg-white lg:mt-0 lg:rounded-xl lg:border lg:border-black/10">
                    <section
                        className="grid min-w-0 items-start lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.85fr)] lg:gap-x-8 lg:p-8"
                        aria-label="Detalle y compra del producto"
                    >
                        <div className="order-1 min-w-0 px-4 pt-1 sm:px-6 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
                            {producto.categorias?.[0] && (
                                <Link
                                    href={route('tienda.index', { categoria: producto.categorias[0].id })}
                                    className="mb-3 inline-flex min-h-8 items-center text-xs font-medium text-[#6000ca] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                                >
                                    Ver más productos de {producto.categorias[0].nombre}
                                </Link>
                            )}
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                                <span>Tienda Chisperío</span>
                                {producto.is_featured && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>Producto destacado</span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-[19px] font-medium leading-snug tracking-[-0.015em] lg:text-2xl lg:font-semibold">
                                {producto.titulo}
                            </h1>
                        </div>
                        <div className="order-2 min-w-0 pt-3 lg:order-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-stretch lg:pt-0">
                            <StickyGallery offset={128}>
                                <ProductGallery
                                    imagenes={galeriaImagenes}
                                    videos={galeriaVideos}
                                    titulo={producto.titulo}
                                />
                            </StickyGallery>
                        </div>
                        <div className="order-3 min-w-0 px-4 pb-7 pt-5 sm:px-6 lg:col-start-2 lg:row-start-2 lg:px-0 lg:pb-0 lg:pt-5">
                            {!agotado && tieneVariantes && <div className="lg:hidden">{selectorColor}</div>}
                            <div aria-live="polite" aria-atomic="true">
                                {tieneDescuento && (
                                    <p className="mb-1 text-sm text-[#737373] line-through">
                                        {formatPrice(
                                            precioInfo.precioBase + precioInfo.recargoVariante + precioInfo.addonsTotal,
                                        )}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p className="text-[36px] font-medium leading-tight tracking-[-0.04em] lg:text-[40px]">
                                        {formatPrice(precioInfo.precioFinalConOpciones)}
                                    </p>
                                    {tieneDescuento && (
                                        <span className="text-sm font-semibold text-[#008744]">
                                            {ahorroPorcentaje}% OFF en el precio base
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-[#737373]">
                                    {repartoActivo
                                        ? 'Base por unidad con personalizaciones. El adicional de cada color se suma en el total.'
                                        : `Precio por unidad${tieneOpciones ? ', con las opciones elegidas' : ''}.`}
                                </p>
                            </div>
                            <ProductPaymentOptions
                                planes={planesPagoActivos}
                                planSeleccionado={planPagoSeleccionado}
                                recargoInfo={recargoInfo}
                                total={totalProductoActual}
                                qty={qty}
                                incompleto={repartoIncompleto}
                                onSelect={togglePlanPago}
                            />
                            {tieneOpciones && (
                                <details className="group mt-2 text-xs">
                                    <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] [&::-webkit-details-marker]:hidden">
                                        Ver detalle del precio <ArrowIcon className="h-3 w-3" />
                                    </summary>
                                    <dl className="space-y-2 rounded-lg bg-[#f5f5f5] p-3">
                                        <div className="flex justify-between gap-3">
                                            <dt>Precio base</dt>
                                            <dd>{formatPrice(precioInfo.precioFinal)}</dd>
                                        </div>
                                        {precioInfo.recargoVariante > 0 && (
                                            <div className="flex justify-between gap-3">
                                                <dt>Color {varianteSeleccionada?.nombre}</dt>
                                                <dd>+ {formatPrice(precioInfo.recargoVariante)}</dd>
                                            </div>
                                        )}
                                        {precioInfo.addonsTotal > 0 && (
                                            <div className="flex justify-between gap-3">
                                                <dt>Personalizaciones</dt>
                                                <dd>+ {formatPrice(precioInfo.addonsTotal)}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </details>
                            )}
                            {!agotado && (
                                <ProductDeliveryInfo
                                    montoMinimo={configuracionEnvio?.montoMinimo}
                                    total={totalProductoActual}
                                />
                            )}
                            {agotado ? (
                                <div className="mt-5 rounded-lg bg-[#f5f5f5] p-4">
                                    <p className="text-sm font-semibold text-[#ba1a1a]">Sin stock</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[#737373]">
                                        Este producto no tiene unidades disponibles en este momento.
                                    </p>
                                    <Link
                                        href={route('tienda.index')}
                                        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#6000ca]"
                                    >
                                        Ver otros productos <ArrowIcon />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <p className={`mt-3 text-sm font-semibold ${stockBajo ? 'text-[#a15c00]' : ''}`}>
                                        {stockBajo
                                            ? maxQty === 1
                                                ? '¡Última unidad disponible!'
                                                : `Quedan ${maxQty} unidades${tieneVariantes ? ' de este color' : ''}`
                                            : maxQty === 0 && !repartoActivo
                                              ? 'Sin stock en este color'
                                              : 'Stock disponible'}
                                    </p>
                                    <div className="mt-3 rounded-lg bg-[#f5f5f5] p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm">
                                                <span className="font-medium">Cantidad: {qty}</span>
                                                {topeCantidad !== null && (
                                                    <span className="ml-2 text-xs text-[#737373]">
                                                        ({topeCantidad} disponibles)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center rounded-md border border-black/10 bg-white">
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarQty(qty - 1)}
                                                    disabled={qty <= 1}
                                                    aria-label="Reducir cantidad"
                                                    className="flex h-11 w-11 items-center justify-center rounded-l-md text-xl text-[#6000ca] hover:bg-[#6000ca]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] disabled:cursor-not-allowed disabled:text-black/20"
                                                >
                                                    −
                                                </button>
                                                <span
                                                    className="min-w-8 text-center text-sm font-semibold"
                                                    aria-live="polite"
                                                >
                                                    {qty}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarQty(qty + 1)}
                                                    disabled={topeCantidad !== null && qty >= topeCantidad}
                                                    aria-label="Aumentar cantidad"
                                                    className="flex h-11 w-11 items-center justify-center rounded-r-md text-xl text-[#6000ca] hover:bg-[#6000ca]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] disabled:cursor-not-allowed disabled:text-black/20"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        {producto.escalas_precio?.length > 0 && (
                                            <div className="mt-3 border-t border-black/[0.06] pt-3">
                                                <p className="mb-2 text-xs font-medium text-[#6000ca]">
                                                    Llevá más unidades y mejorá el precio
                                                </p>
                                                <PillsCantidad producto={producto} qty={qty} onChange={cambiarQty} />
                                            </div>
                                        )}
                                    </div>
                                    {(tieneVariantes || tieneAddons) && (
                                        <div className={`mt-5 ${tieneAddons ? '' : 'hidden lg:block'}`}>
                                            <div className="hidden lg:block">{selectorColor}</div>
                                            <ProductoAddonsChecklist
                                                addons={addons}
                                                seleccionados={addonIds}
                                                textos={addonTextos}
                                                onToggle={toggleAddon}
                                                onTextoChange={cambiarTextoAddon}
                                            />
                                        </div>
                                    )}
                                    {qty > 1 && (
                                        <div
                                            className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
                                            aria-live="polite"
                                            aria-atomic="true"
                                        >
                                            <p className="text-sm text-[#737373]">
                                                {repartoIncompleto
                                                    ? `Total (${sumAsignado} de ${qty} asignadas)`
                                                    : `Total por ${qty} unidades`}
                                            </p>
                                            <p className="text-xl font-semibold">{formatPrice(totalProductoActual)}</p>
                                        </div>
                                    )}
                                    <div className="mt-5 space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => addToCart(true)}
                                            disabled={!puedeAgregar}
                                            aria-describedby={!puedeAgregar ? 'seleccion-producto-aviso' : undefined}
                                            className="flex min-h-12 w-full items-center justify-center rounded-md bg-[#6000ca] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#737373]"
                                        >
                                            Comprar ahora
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addToCart()}
                                            disabled={!puedeAgregar}
                                            aria-describedby={!puedeAgregar ? 'seleccion-producto-aviso' : undefined}
                                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#6000ca]/[0.08] px-4 py-3 text-sm font-semibold text-[#6000ca] transition-colors hover:bg-[#6000ca]/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-[#737373]"
                                        >
                                            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" /> Agregar al
                                            carrito
                                        </button>
                                    </div>
                                    {!puedeAgregar && (
                                        <p
                                            id="seleccion-producto-aviso"
                                            role="status"
                                            className="mt-3 text-xs leading-relaxed text-[#ba1a1a]"
                                        >
                                            {faltaElegirVariante
                                                ? 'Elegí un color para continuar.'
                                                : repartoIncompleto
                                                  ? `Repartí las ${qty} unidades entre los colores para continuar.`
                                                  : faltaCompletarColorPersonalizado || faltaColorPersonalizadoReparto
                                                    ? 'Elegí un color personalizado o escribí una descripción para continuar.'
                                                    : !addonsValidos
                                                      ? 'Completá el texto de las personalizaciones elegidas para continuar.'
                                                      : 'Elegí otro color con stock disponible.'}
                                        </p>
                                    )}
                                    <p className="mt-3 text-center text-xs leading-relaxed text-[#737373]">
                                        Completá tus datos y coordiná el pago por WhatsApp.
                                    </p>
                                </>
                            )}
                            <ProductSellerInfo tieneResenas={resenas.length > 0} />
                        </div>
                    </section>
                    {producto.descripcion && (
                        <section
                            className="border-t border-black/10 px-4 py-8 sm:px-6 lg:px-8"
                            aria-labelledby="descripcion-producto"
                        >
                            <h2 id="descripcion-producto" className="mb-5 text-lg font-medium">
                                Lo que tenés que saber de este producto
                            </h2>
                            <div
                                className="quill-content max-w-3xl break-words text-sm leading-7 text-[#4b4356] [&_li]:mb-2 [&_p]:mb-3"
                                dangerouslySetInnerHTML={{ __html: producto.descripcion }}
                            />
                        </section>
                    )}
                    <ProductAttributes producto={producto} />
                </div>
                <div id="opiniones-clientes" className="scroll-mt-36">
                    <ResenasConfianza resenas={resenas} compact />
                </div>
                {relacionados?.length > 0 && (
                    <section
                        className="mt-8 border-t border-black/10 py-8 lg:rounded-xl lg:border lg:bg-white"
                        aria-labelledby="productos-relacionados"
                    >
                        <div className="mb-5 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                            <h2 id="productos-relacionados" className="text-lg font-medium">
                                Productos relacionados
                            </h2>
                            <Link
                                href={route('tienda.index')}
                                className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium text-[#6000ca] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                            >
                                Ver catálogo <ArrowIcon className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="no-scrollbar flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-2 sm:px-6 md:grid md:grid-cols-3 md:gap-4 lg:px-8">
                            {relacionados.map((prod) => (
                                <RelatedCard key={prod.id} producto={prod} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <LandingFooter />
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-24 left-1/2 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg bg-[#1c1b1b] px-4 py-3 text-xs text-white shadow-xl md:bottom-8"
                >
                    <span className="min-w-0">{toast}</span>
                    <Link
                        href={route('carrito.index')}
                        className="shrink-0 rounded py-2 font-semibold text-white underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        Ver carrito
                    </Link>
                </div>
            )}
        </div>
    );
}
