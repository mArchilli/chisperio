import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import { useCart } from '@/Context/CartContext';

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

function ProductGallery({ imagenes, titulo }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const imgs = imagenes?.length > 0 ? imagenes : null;

    if (!imgs) {
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

    const current = imgs[activeIdx];

    return (
        <div className="space-y-3 lg:space-y-4">
            <div className="group relative aspect-square w-full overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-[#f6f3f8] sm:rounded-[2rem] md:aspect-[4/3] lg:aspect-square">
                <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-[46px] border-white/45" />
                <div className="pointer-events-none absolute -bottom-20 -left-12 h-60 w-60 rounded-full bg-[#6000ca]/[0.035] blur-2xl" />

                <img
                    src={`/${current.ruta}`}
                    alt={titulo}
                    className="relative h-full w-full object-contain p-5 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.015] sm:p-8 lg:p-10 motion-reduce:transition-none"
                />

                {imgs.length > 1 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4 md:hidden">
                        <div className="flex items-center rounded-full border border-white/70 bg-white/85 px-1.5 shadow-lg shadow-[#1c1b1b]/10 backdrop-blur-md">
                            {imgs.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveIdx(i)}
                                    aria-label={`Ver imagen ${i + 1} de ${imgs.length}`}
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

            {imgs.length > 1 && (
                <div className="hidden gap-3 overflow-x-auto md:flex lg:grid lg:grid-cols-4 lg:overflow-visible">
                    {imgs.slice(0, 4).map((img, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActiveIdx(i)}
                            aria-label={`Ver imagen ${i + 1} de ${imgs.length}`}
                            aria-pressed={i === activeIdx}
                            className={`group/thumb relative aspect-square w-24 flex-shrink-0 overflow-hidden rounded-2xl border bg-[#f6f3f8] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 lg:w-auto ${
                                i === activeIdx
                                    ? 'border-[#6000ca] shadow-[0_10px_25px_-18px_rgba(96,0,202,0.8)]'
                                    : 'border-black/[0.06] hover:border-[#6000ca]/35'
                            }`}
                        >
                            <img
                                src={`/${img.ruta}`}
                                alt=""
                                className="h-full w-full object-contain p-2.5 mix-blend-multiply transition-transform duration-300 group-hover/thumb:scale-105 motion-reduce:transition-none"
                            />
                            {i === activeIdx && (
                                <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[#6000ca]" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function RelatedCard({ producto }) {
    const hasOffer = !!producto.oferta_vigente;
    const displayPrice = hasOffer ? producto.oferta_vigente.precio_oferta : producto.precio;

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
    const [qty, setQty] = useState(1);
    const [isFav, setIsFav] = useState(false);
    const [expandDesc, setExpandDesc] = useState(false);
    const [toast, setToast] = useState(null);
    const { addToCart: addToCartContext } = useCart();

    const hasOffer = !!producto.oferta_vigente;
    const displayPrice = hasOffer ? producto.oferta_vigente.precio_oferta : producto.precio;
    const discount = hasOffer ? Math.round(producto.oferta_vigente.porcentaje_descuento) : null;

    const addToCart = () => {
        addToCartContext(producto, qty);
        if (toast) clearTimeout(window._toastTimer);
        setToast(`${producto.titulo} agregado al carrito`);
        window._toastTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div className="min-h-screen overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title={`${producto.titulo} — Chisperío`} />
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
                        <ProductGallery imagenes={producto.imagenes} titulo={producto.titulo} />

                        <div className="px-3 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-5 lg:px-5 lg:py-6 xl:px-8 xl:py-8">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                        {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {hasOffer && (
                                            <span className="rounded-full bg-[#FF00D4] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                                                {discount}% off
                                            </span>
                                        )}
                                        {!hasOffer && producto.is_featured && (
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
                                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                                    <span className="text-[clamp(2.25rem,10vw,3.25rem)] font-black leading-none tracking-[-0.045em] text-[#6000ca]">
                                        {formatPrice(displayPrice)}
                                    </span>
                                    {hasOffer && (
                                        <span className="pb-1 text-sm font-semibold text-[#81788a] line-through">
                                            {formatPrice(producto.precio)}
                                        </span>
                                    )}
                                </div>
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

                            <div className="mt-6 rounded-[1.5rem] border border-black/[0.05] bg-[#f7f6f9] p-4 sm:p-5">
                                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                                    Elegí la cantidad
                                </p>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="flex h-14 w-full items-center justify-between rounded-full border border-black/[0.08] bg-white px-1 shadow-sm sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => setQty((q) => Math.max(1, q - 1))}
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
                                            onClick={() => setQty((q) => q + 1)}
                                            className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold leading-none text-[#6000ca] transition-colors hover:bg-[#6000ca]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-95"
                                            aria-label="Aumentar cantidad"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        className="flex h-14 w-full flex-1 items-center justify-center gap-2.5 rounded-full bg-[#6000ca] px-6 text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_12px_25px_-12px_rgba(96,0,202,0.8)] transition-all hover:bg-[#4f00a8] hover:shadow-[0_16px_30px_-12px_rgba(96,0,202,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transform-none"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25h10.5l.75 12H6l.75-12z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V6.75a3 3 0 016 0V9" />
                                        </svg>
                                        Añadir al carrito
                                    </button>
                                </div>
                            </div>

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
