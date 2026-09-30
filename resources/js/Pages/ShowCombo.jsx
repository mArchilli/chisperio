import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import BackToCatalog from '@/Components/BackToCatalog';
import LandingFooter from '@/Components/Landing/LandingFooter';
import ProductImageLightbox from '@/Components/ProductImageLightbox';
import VarianteColorSwatches from '@/Components/VarianteColorSwatches';
import { useCart } from '@/Context/CartContext';
import { resolverPrecio } from '@/lib/pricing';
import { stockDisponibleCombo } from '@/lib/combo';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

function ArrowIcon({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
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
            className={`group/thumb relative aspect-square w-24 flex-shrink-0 overflow-hidden rounded-2xl border bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 lg:w-auto ${
                i === activeIdx ? 'border-[#6000ca] shadow-[0_10px_25px_-18px_rgba(96,0,202,0.8)]' : 'border-black/[0.06] hover:border-[#6000ca]/35'
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
                <img src={`/${item.ruta}`} alt="" className="h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover/thumb:scale-105 motion-reduce:transition-none" />
            )}
            {i === activeIdx && <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[#6000ca]" />}
        </button>
    );
}

function ComboGallery({ imagenes, videos, titulo }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const items = useMemo(
        () => [...(imagenes ?? []).map((item) => ({ ...item, kind: 'imagen' })), ...(videos ?? []).map((item) => ({ ...item, kind: 'video' }))],
        [imagenes, videos]
    );

    if (items.length === 0) {
        return (
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-white sm:rounded-[2rem] md:aspect-[4/3] lg:aspect-square">
                <span className="relative flex h-36 w-36 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-7xl font-black text-[#6000ca]/20 shadow-[0_18px_50px_-30px_rgba(96,0,202,0.45)] sm:h-44 sm:w-44 sm:text-8xl">
                    {titulo?.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    const current = items[activeIdx];
    const imagenesSolas = items.filter((item) => item.kind === 'imagen');

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="group relative aspect-square w-full overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-white sm:rounded-[2rem] md:aspect-[4/3] lg:aspect-square">
                {current.kind === 'video' ? (
                    <video key={current.id} src={`/${current.ruta}`} controls playsInline className="relative h-full w-full object-contain p-3 sm:p-5" />
                ) : (
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        aria-label="Ver imagen ampliada"
                        className="relative block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                    >
                        <img src={`/${current.ruta}`} alt={titulo} className="relative h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.015] sm:p-8 lg:p-10 motion-reduce:transition-none" />
                    </button>
                )}
            </div>

            {items.length > 1 && (
                <div className="hidden gap-3 overflow-x-auto md:flex lg:grid lg:grid-cols-4 lg:overflow-visible">
                    {items.slice(0, 4).map((item, i) => (
                        <GalleryThumb key={i} item={item} i={i} total={items.length} activeIdx={activeIdx} onSelect={setActiveIdx} />
                    ))}
                </div>
            )}

            {lightboxOpen && (
                <ProductImageLightbox images={imagenesSolas} index={activeIdx} onIndexChange={setActiveIdx} onClose={() => setLightboxOpen(false)} />
            )}
        </div>
    );
}

/**
 * Items del combo que exigen que el comprador elija una variante (sin variante fija
 * y el producto tiene colores activos) — ComboProducto::requiereSeleccionVariante().
 */
function itemsConSeleccionRequerida(combo) {
    return (combo.items ?? []).filter(
        (item) => item.producto_variante_id === null && (item.producto?.variantes_activas?.length ?? 0) > 0
    );
}

export default function ShowCombo({ combo, canLogin }) {
    const { addComboToCart } = useCart();
    const itemsRequeridos = useMemo(() => itemsConSeleccionRequerida(combo), [combo]);

    const [selecciones, setSelecciones] = useState(() => {
        const inicial = {};
        itemsRequeridos.forEach((item) => {
            inicial[item.id] = item.producto.variantes_activas[0]?.id ?? null;
        });
        return inicial;
    });
    const [qty, setQty] = useState(1);
    const [toast, setToast] = useState(null);

    const seleccionParaStock = useMemo(() => selecciones, [selecciones]);
    const topeCantidad = stockDisponibleCombo(combo, seleccionParaStock);
    const agotado = topeCantidad === 0;

    useEffect(() => {
        if (topeCantidad !== null && qty > topeCantidad) {
            setQty(Math.max(1, topeCantidad));
        }
    }, [topeCantidad]);

    const precioInfo = resolverPrecio(combo, qty);
    const tieneDescuento = precioInfo.ofertaAplicada;

    const faltaElegirAlgunaVariante = itemsRequeridos.some((item) => !selecciones[item.id]);
    const puedeAgregar = !agotado && topeCantidad !== 0 && !faltaElegirAlgunaVariante;

    const setSeleccionItem = (itemId, varianteId) => {
        setSelecciones((prev) => ({ ...prev, [itemId]: varianteId }));
    };

    const handleAddToCart = () => {
        if (!puedeAgregar) return;

        const seleccionesArray = itemsRequeridos.map((item) => {
            const varianteId = selecciones[item.id];
            const variante = item.producto.variantes_activas.find((v) => v.id === varianteId);
            return {
                comboItemId: item.id,
                productoId: item.producto_id,
                varianteId,
                varianteNombre: variante?.nombre ?? null,
                varianteColorHex: variante?.color_hex ?? null,
            };
        });

        addComboToCart(combo, qty, seleccionesArray);

        if (toast) clearTimeout(window._toastComboTimer);
        setToast(`${combo.titulo} agregado al carrito`);
        window._toastComboTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div className="min-h-screen overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title={combo.titulo} />
            <LandingHeader canLogin={canLogin} />

            <main className="relative pb-28 md:pb-20">
                <BackToCatalog cardKey={`c-${combo.id}`} />

                <nav aria-label="Migas de pan" className="relative hidden w-full flex-wrap items-center gap-2 px-3 py-6 text-xs font-semibold text-[#81788a] sm:px-4 md:flex">
                    <Link href="/" className="rounded-md transition-colors hover:text-[#6000ca]">Inicio</Link>
                    <ArrowIcon className="h-3 w-3 text-[#b8afc0]" />
                    <Link href={route('tienda.index', { filter: 'combos' })} className="rounded-md transition-colors hover:text-[#6000ca]">Combos</Link>
                    <ArrowIcon className="h-3 w-3 text-[#b8afc0]" />
                    <span className="max-w-xs truncate font-extrabold text-[#1c1b1b]">{combo.titulo}</span>
                </nav>

                <section className="relative w-full px-3 pt-3 sm:px-4 md:pt-0">
                    <div className="grid items-start gap-2 rounded-[2rem] border border-black/[0.06] bg-white p-2 shadow-[0_30px_70px_-48px_rgba(28,27,27,0.5)] sm:gap-4 sm:rounded-[2.5rem] sm:p-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-6 lg:p-4">
                        <ComboGallery imagenes={combo.imagenes} videos={combo.videos} titulo={combo.titulo} />

                        <div className="px-3 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-5 lg:px-5 lg:py-6 xl:px-8 xl:py-8">
                            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">Combo</p>

                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                {agotado && (
                                    <span className="rounded-full bg-[#ba1a1a] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg">Sin stock</span>
                                )}
                                {tieneDescuento && (
                                    <span className="rounded-full bg-[#FF00D4] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg">
                                        {precioInfo.ahorroPorcentaje}% off
                                    </span>
                                )}
                                {combo.envio_gratis && (
                                    <span className="rounded-full bg-[#40B0C2] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg">
                                        🚚 Envío gratis
                                    </span>
                                )}
                            </div>

                            <h1 className="text-[clamp(2rem,8vw,3.15rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#1c1b1b] lg:text-[clamp(2.35rem,4vw,3.7rem)]">
                                {combo.titulo}
                            </h1>

                            {combo.descripcion && <p className="mt-4 text-sm leading-relaxed text-[#4b4356]">{combo.descripcion}</p>}

                            <div className="mt-6 rounded-[1.5rem] border border-[#6000ca]/[0.08] bg-[#f7f4fa] p-5 sm:p-6">
                                <div className="flex items-end justify-between">
                                    <div>
                                        {tieneDescuento && (
                                            <p className="text-sm font-medium leading-none text-[#81788a] line-through">{formatPrice(precioInfo.precioBase)}</p>
                                        )}
                                        <p className="mt-1 text-3xl font-black leading-none text-[#6000ca]">{formatPrice(precioInfo.precioFinalConOpciones)}</p>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white p-1">
                                        <button
                                            type="button"
                                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                                            disabled={qty <= 1}
                                            className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-[#6000ca] disabled:opacity-30"
                                        >
                                            −
                                        </button>
                                        <span className="w-8 text-center font-bold">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => setQty((q) => (topeCantidad === null ? q + 1 : Math.min(topeCantidad, q + 1)))}
                                            disabled={topeCantidad !== null && qty >= topeCantidad}
                                            className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-[#6000ca] disabled:opacity-30"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.1em] text-[#1c1b1b]">Este combo incluye</h2>
                                <div className="space-y-3">
                                    {(combo.items ?? []).map((item) => {
                                        const requiereEleccion = item.producto_variante_id === null && (item.producto?.variantes_activas?.length ?? 0) > 0;
                                        const varianteFija = item.producto_variante;

                                        return (
                                            <div key={item.id} className="rounded-2xl border border-black/[0.06] bg-white p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-bold text-[#1c1b1b]">
                                                        {item.cantidad} × {item.producto?.titulo}
                                                    </p>
                                                    {varianteFija && (
                                                        <span className="flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-[#4b4356]">
                                                            <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: varianteFija.color_hex || '#ccc' }} />
                                                            {varianteFija.nombre}
                                                        </span>
                                                    )}
                                                </div>

                                                {requiereEleccion && (
                                                    <div className="mt-3">
                                                        <VarianteColorSwatches
                                                            variantes={item.producto.variantes_activas}
                                                            value={selecciones[item.id] ?? null}
                                                            onChange={(varianteId) => setSeleccionItem(item.id, varianteId)}
                                                            colorPersonalizado=""
                                                            textoPersonalizado=""
                                                            onColorPersonalizadoChange={() => {}}
                                                            onTextoPersonalizadoChange={() => {}}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={!puedeAgregar}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#6000ca] px-6 py-4 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_20px_40px_-20px_rgba(96,0,202,0.7)] transition-all hover:bg-[#4d00a3] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                            >
                                {agotado ? 'Sin stock' : faltaElegirAlgunaVariante ? 'Elegí los colores del combo' : 'Agregar combo al carrito'}
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1c1b1b] px-6 py-3 text-sm font-semibold text-white shadow-xl">
                    {toast}
                </div>
            )}

            <LandingFooter />
        </div>
    );
}
