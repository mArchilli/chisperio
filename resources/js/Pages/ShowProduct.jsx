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

function ProductGallery({ imagenes, titulo }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const imgs = imagenes?.length > 0 ? imagenes : null;

    if (!imgs) {
        return (
            <>
                {/* Mobile: full-width placeholder */}
                <div className="md:hidden w-full aspect-square bg-[#f0eded] flex items-center justify-center">
                    <span className="text-8xl font-black text-[#6000ca]/20 select-none">
                        {titulo?.charAt(0).toUpperCase()}
                    </span>
                </div>
                {/* Desktop: boxed placeholder */}
                <div className="hidden md:flex w-full aspect-square bg-[#f6f3f2] rounded-xl border border-gray-100 items-center justify-center">
                    <span className="text-8xl font-black text-[#6000ca]/20 select-none">
                        {titulo?.charAt(0).toUpperCase()}
                    </span>
                </div>
            </>
        );
    }

    const current = imgs[activeIdx];

    return (
        <div className="md:space-y-3">
            {/* Main image */}
            <div className="relative w-full aspect-square bg-white overflow-hidden md:rounded-xl md:border md:border-gray-100">
                <img
                    src={`/${current.ruta}`}
                    alt={titulo}
                    className="w-full h-full object-cover"
                />
                {/* Carousel dots — mobile only */}
                {imgs.length > 1 && (
                    <div className="md:hidden absolute bottom-4 left-0 w-full flex justify-center gap-2">
                        {imgs.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveIdx(i)}
                                aria-label={`Imagen ${i + 1}`}
                                className={`rounded-full transition-all ${
                                    i === activeIdx
                                        ? 'w-8 h-1.5 bg-[#6000ca]'
                                        : 'w-1.5 h-1.5 bg-gray-300'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnails — desktop only */}
            {imgs.length > 1 && (
                <div className="hidden md:grid grid-cols-4 gap-3">
                    {imgs.slice(0, 4).map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIdx(i)}
                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                                i === activeIdx
                                    ? 'border-[#6000ca]'
                                    : 'border-gray-200 hover:border-[#6000ca]/40'
                            }`}
                        >
                            <img
                                src={`/${img.ruta}`}
                                alt=""
                                className="w-full h-full object-cover"
                            />
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
            className="min-w-[160px] md:min-w-0 bg-white border border-gray-100 rounded-xl p-3 shadow-sm block hover:shadow-md transition-shadow flex-shrink-0"
        >
            <div className="aspect-square rounded-lg bg-[#f6f3f2] mb-3 overflow-hidden flex items-center justify-center">
                {producto.imagen_principal ? (
                    <img
                        src={`/${producto.imagen_principal.ruta}`}
                        alt={producto.titulo}
                        className="w-full h-full object-contain mix-blend-multiply"
                    />
                ) : (
                    <span className="text-3xl font-black text-[#6000ca]/20 select-none">
                        {producto.titulo?.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>
            <p className="font-bold text-sm text-[#1c1b1b] line-clamp-2 leading-tight mb-1">
                {producto.titulo}
            </p>
            {hasOffer && (
                <p className="text-xs text-gray-400 line-through leading-none">{formatPrice(producto.precio)}</p>
            )}
            <p className="text-[#6000ca] font-black text-base">{formatPrice(displayPrice)}</p>
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
        <div
            className="bg-[#fcf9f8] min-h-screen text-[#1c1b1b] antialiased"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            <Head title={`${producto.titulo} — Chisperío`} />
            <LandingHeader canLogin={canLogin} />

            <main className="pb-28 md:pb-16">

                {/* Breadcrumbs — desktop only */}
                <nav className="hidden md:flex max-w-[1280px] mx-auto px-8 py-6 text-sm text-[#4b4356] gap-2 items-center flex-wrap">
                    <Link href="/" className="hover:text-[#6000ca] transition-colors">Inicio</Link>
                    <span className="text-gray-300">/</span>
                    <Link href={route('tienda.index')} className="hover:text-[#6000ca] transition-colors">Catálogo</Link>
                    {producto.categorias?.[0] && (
                        <>
                            <span className="text-gray-300">/</span>
                            <Link
                                href={route('tienda.index', { categoria: producto.categorias[0].id })}
                                className="hover:text-[#6000ca] transition-colors"
                            >
                                {producto.categorias[0].nombre}
                            </Link>
                        </>
                    )}
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-[#1c1b1b] truncate max-w-xs">{producto.titulo}</span>
                </nav>

                {/* Product Hero: gallery + info */}
                <div className="md:max-w-[1280px] md:mx-auto md:px-8 md:grid md:grid-cols-2 md:gap-12 md:mb-20">

                    {/* Gallery */}
                    <ProductGallery imagenes={producto.imagenes} titulo={producto.titulo} />

                    {/* Details */}
                    <div className="px-4 md:px-0 pt-5 md:pt-0 md:flex md:flex-col md:justify-start">

                        {/* Status badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {hasOffer && (
                                <span className="bg-[#FF00D4] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    {discount}% OFF
                                </span>
                            )}
                            {!hasOffer && producto.is_featured && (
                                <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Destacado
                                </span>
                            )}
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Envío Gratis
                            </span>
                        </div>

                        {/* Title + Favorite */}
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl md:text-[36px] font-extrabold text-[#1c1b1b] leading-tight tracking-tight pr-3">
                                {producto.titulo}
                            </h1>
                            <button
                                onClick={() => setIsFav(!isFav)}
                                className="flex-shrink-0 p-2 rounded-full hover:bg-pink-50 transition-colors"
                                aria-label={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                            >
                                <svg
                                    className={`w-6 h-6 transition-colors ${isFav ? 'text-pink-500' : 'text-gray-400'}`}
                                    fill={isFav ? 'currentColor' : 'none'}
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>

                        {/* Price */}
                        <div className="mb-5">
                            {hasOffer && (
                                <span className="text-sm text-gray-400 line-through block leading-none mb-1">
                                    {formatPrice(producto.precio)}
                                </span>
                            )}
                            <span className="text-4xl md:text-[42px] font-black text-[#6000ca] leading-none">
                                {formatPrice(displayPrice)}
                            </span>
                            <p className="text-xs text-[#4b4356] mt-1.5">
                                IVA incluido. Paga en hasta 12 cuotas sin interés.
                            </p>
                        </div>

                        {/* Description */}
                        {producto.descripcion && (
                            <div className="mb-6 border-t border-gray-100 pt-5">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#4b4356] mb-2">
                                    Descripción
                                </h3>
                                <div
                                    className={`quill-content text-sm md:text-base text-[#4b4356] leading-relaxed ${!expandDesc ? 'line-clamp-4 md:line-clamp-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: producto.descripcion }}
                                />
                                {!expandDesc && (
                                    <button
                                        onClick={() => setExpandDesc(true)}
                                        className="md:hidden mt-2 text-[#6000ca] font-bold text-sm flex items-center gap-1"
                                    >
                                        Ver descripción completa
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Quantity + Add to Cart */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                                <button
                                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                                    className="w-11 h-12 flex items-center justify-center text-[#6000ca] hover:bg-purple-50 transition-colors font-bold text-xl leading-none"
                                    aria-label="Reducir cantidad"
                                >
                                    −
                                </button>
                                <span className="w-10 text-center font-bold text-[#1c1b1b] select-none">
                                    {qty}
                                </span>
                                <button
                                    onClick={() => setQty((q) => q + 1)}
                                    className="w-11 h-12 flex items-center justify-center text-[#6000ca] hover:bg-purple-50 transition-colors font-bold text-xl leading-none"
                                    aria-label="Aumentar cantidad"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={addToCart}
                                className="flex-1 h-12 bg-[#FF00D4] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d900b3] active:scale-95 transition-all shadow-lg shadow-pink-500/20 text-sm"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Añadir al Carrito
                            </button>
                        </div>

                        {/* Category tags */}
                        {producto.categorias?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {producto.categorias.map((cat) => (
                                    <Link
                                        key={cat.id}
                                        href={route('tienda.index', { categoria: cat.id })}
                                        className="text-xs font-semibold text-[#6000ca] bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
                                    >
                                        {cat.nombre}
                                    </Link>
                                ))}
                                {producto.subcategorias?.map((sub) => (
                                    <span
                                        key={sub.id}
                                        className="text-xs font-semibold text-[#4b4356] bg-gray-100 px-3 py-1.5 rounded-full"
                                    >
                                        {sub.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Products */}
                {relacionados?.length > 0 && (
                    <section className="mt-14 md:max-w-[1280px] md:mx-auto md:px-8">
                        <div className="flex justify-between items-center px-4 md:px-0 mb-4">
                            <div>
                                <h2 className="text-xl md:text-2xl font-extrabold text-[#1c1b1b]">
                                    Productos Relacionados
                                </h2>
                                <div className="h-1 w-14 bg-[#6000ca] rounded-full mt-1.5" />
                            </div>
                            <Link
                                href={route('tienda.index')}
                                className="text-[#6000ca] font-bold text-sm flex items-center gap-1 hover:underline"
                            >
                                Ver catálogo
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>

                        {/* Mobile: horizontal scroll */}
                        <div className="md:hidden flex gap-4 px-4 overflow-x-auto no-scrollbar pb-2">
                            {relacionados.map((prod) => (
                                <RelatedCard key={prod.id} producto={prod} />
                            ))}
                        </div>

                        {/* Desktop: grid */}
                        <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-5">
                            {relacionados.map((prod) => (
                                <RelatedCard key={prod.id} producto={prod} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Featured Banner */}
                <section className="mt-14 mx-4 md:max-w-[1280px] md:mx-auto md:px-8">
                    <div className="relative rounded-2xl overflow-hidden bg-[#7d12ff] p-8 md:p-16">
                        <div className="relative z-10 max-w-xl">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#ffd8ed] mb-3 block">
                                Tecnología de Vanguardia
                            </span>
                            <h2 className="text-2xl md:text-[36px] font-extrabold text-white leading-tight mb-4">
                                Domina el Escenario con Efectos Chisperío
                            </h2>
                            <p className="text-sm md:text-base text-white/75 mb-6 leading-relaxed">
                                Nuestras máquinas están diseñadas para ofrecer un rendimiento impecable bajo las condiciones más exigentes. Seguridad certificada y efectos visuales de alto impacto.
                            </p>
                            <Link
                                href={route('tienda.index')}
                                className="inline-flex items-center bg-white text-[#6000ca] px-6 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors shadow-xl text-sm gap-2"
                            >
                                Ver catálogo completo
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>

                        {/* Decorative circles */}
                        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5" />
                        <div className="absolute -right-4 bottom-0 w-40 h-40 rounded-full bg-white/5" />
                    </div>
                </section>

            </main>

            <LandingFooter />

            {/* Cart Toast */}
            {toast && (
                <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-[#1c1b1b] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-2.5 whitespace-nowrap pointer-events-none">
                    <svg className="w-4 h-4 text-[#FF00D4] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {toast}
                </div>
            )}
        </div>
    );
}
