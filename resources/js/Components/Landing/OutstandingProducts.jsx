import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/Context/CartContext';
import { resolverPrecio } from '@/lib/pricing';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(price));

function ArrowIcon({ direction = 'right' }) {
    return (
        <svg
            className={`h-4 w-4 ${direction === 'left' ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

function BagIcon({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25h10.5l.75 12H6l.75-12z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V6.75a3 3 0 016 0V9" />
        </svg>
    );
}

function ProductImage({ producto }) {
    const imagePath = producto.imagen_principal?.ruta;
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [imagePath]);

    if (!imagePath || imageFailed) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-white" aria-hidden="true">
                <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-5xl font-black text-[#6000ca]/25 shadow-sm">
                    {producto.titulo?.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <img
            src={`/${imagePath}`}
            alt={producto.titulo}
            className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04] md:p-7"
            loading="lazy"
            onError={() => setImageFailed(true)}
        />
    );
}

function ProductCard({ producto, added, onAddToCart }) {
    const precioInfo = resolverPrecio(producto, 1);
    const offer = precioInfo.precioFinal < precioInfo.precioBase ? producto.oferta_vigente : null;
    const displayPrice = precioInfo.precioFinal;
    const discount = offer ? Math.round(precioInfo.ahorroTotalPorcentaje) : null;

    return (
        <article className="group flex min-w-0 flex-none basis-[84%] snap-start flex-col overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#6000ca]/20 sm:basis-[calc(50%-0.625rem)] lg:basis-[calc(33.333%-0.875rem)] xl:basis-[calc(20%-1.2rem)]">
            <Link
                href={route('tienda.show', producto.id)}
                className="relative block aspect-[4/3] overflow-hidden bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                aria-label={`Ver ${producto.titulo}`}
            >
                <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-4">
                    <span
                        className="inline-flex h-9 w-9 items-center justify-center text-[#6000ca] drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]"
                        aria-label="Producto destacado"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12l-2.8-2.03c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" />
                        </svg>
                    </span>

                    {discount && (
                        <span className="rounded-full bg-[#FF00D4] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                            {discount}% off
                        </span>
                    )}
                </div>

                <ProductImage producto={producto} />
            </Link>

            <div className="flex flex-1 flex-col p-5 md:p-6 xl:p-4 2xl:p-5">
                <p className="mb-2 min-h-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6000ca]">
                    {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                </p>

                <Link
                    href={route('tienda.show', producto.id)}
                    className="line-clamp-2 min-h-12 text-lg font-extrabold leading-snug text-[#1c1b1b] transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                >
                    {producto.titulo}
                </Link>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-black/[0.06] pt-4">
                    <div className="min-w-0">
                        {offer && (
                            <span className="block text-xs font-medium leading-none text-[#81788a] line-through">
                                {formatPrice(producto.precio)}
                            </span>
                        )}
                        <span className={`block font-black leading-none text-[#6000ca] ${offer ? 'mt-1.5 text-xl' : 'text-xl'}`}>
                            {formatPrice(displayPrice)}
                        </span>
                    </div>

                    {producto.tiene_variantes ? (
                        // Producto con variantes de color activas: agregar directo acá no pasa
                        // por el selector de color, así que en vez de eso manda a la ficha (ver
                        // PedidoController::store, que rechaza un item sin variante_id cuando
                        // el producto la requiere) — mismo criterio que Tienda.jsx.
                        <Link
                            href={route('tienda.show', producto.id)}
                            className="inline-flex h-11 flex-shrink-0 items-center justify-center gap-2 rounded-full bg-[#6000ca] px-4 text-xs font-extrabold uppercase tracking-[0.06em] text-white shadow-md shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                            aria-label={`Elegir color de ${producto.titulo}`}
                        >
                            <BagIcon />
                            Elegir color
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onAddToCart(producto)}
                            className={`inline-flex h-11 flex-shrink-0 items-center justify-center gap-2 rounded-full px-4 text-xs font-extrabold uppercase tracking-[0.06em] text-white shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 ${
                                added
                                    ? 'bg-[#1c1b1b] shadow-black/15'
                                    : 'bg-[#6000ca] shadow-[#6000ca]/20 hover:bg-[#4f00a8] hover:shadow-lg'
                            }`}
                            aria-label={`Agregar ${producto.titulo} al carrito`}
                        >
                            {added ? (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Agregado
                                </>
                            ) : (
                                <>
                                    <BagIcon />
                                    Agregar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function OutstandingProducts({ productos = [] }) {
    const productsTrackRef = useRef(null);
    const feedbackTimerRef = useRef(null);
    const [addedProductId, setAddedProductId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const { addToCart } = useCart();

    useEffect(() => () => window.clearTimeout(feedbackTimerRef.current), []);

    if (productos.length === 0) return null;

    const featuredCatalogHref = `${route('tienda.index', { filter: 'destacados' })}#productos`;

    const scrollProducts = (direction) => {
        const track = productsTrackRef.current;
        if (!track) return;

        track.scrollBy({
            left: direction * track.clientWidth * 0.8,
            behavior: 'smooth',
        });
    };

    const handleAddToCart = (producto) => {
        addToCart(producto);
        setAddedProductId(producto.id);
        setFeedbackMessage(`${producto.titulo} agregado al carrito`);
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = window.setTimeout(() => {
            setAddedProductId(null);
            setFeedbackMessage('');
        }, 2200);
    };

    return (
        <section
            id="productos-destacados"
            aria-labelledby="outstanding-products-title"
            className="relative mb-16 scroll-mt-32 overflow-hidden border-y border-[#6000ca]/10 bg-[#fcf9f8] py-14 md:mb-20 md:py-20"
        >
            <div className="relative w-full px-6 md:px-10 lg:px-12 xl:px-16">
                <div className="mb-8 flex flex-col gap-7 md:mb-10 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-4xl">
                        <h2
                            id="outstanding-products-title"
                            className="whitespace-nowrap text-[clamp(1.4rem,7vw,2.5rem)] font-black uppercase leading-[0.96] tracking-tight text-[#1c1b1b] sm:text-[3rem] md:text-[3.25rem] lg:text-[clamp(3rem,4.4vw,4.75rem)]"
                        >
                            Productos <span className="text-[#6000ca]">destacados</span>
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                            Una selección de nuestros efectos favoritos para transformar cada entrada, show y celebración.
                        </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                        <Link
                            href={featuredCatalogHref}
                            className="inline-flex items-center gap-2 rounded-full border-2 border-[#6000ca] bg-white/70 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] transition-all hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-95 md:px-6"
                        >
                            Ver todos
                            <ArrowIcon />
                        </Link>

                        {productos.length > 1 && (
                            <div className="hidden items-center gap-2 md:flex" aria-label="Controles del carrusel">
                                <button
                                    type="button"
                                    onClick={() => scrollProducts(-1)}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#6000ca]/20 bg-white text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                                    aria-label="Ver productos anteriores"
                                >
                                    <ArrowIcon direction="left" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollProducts(1)}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#6000ca]/20 bg-white text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                                    aria-label="Ver más productos destacados"
                                >
                                    <ArrowIcon />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    ref={productsTrackRef}
                    className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 lg:gap-6"
                >
                    {productos.map((producto) => (
                        <ProductCard
                            key={producto.id}
                            producto={producto}
                            added={addedProductId === producto.id}
                            onAddToCart={handleAddToCart}
                        />
                    ))}
                </div>

                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#4b4356]/70 md:hidden">
                    Deslizá para descubrir más
                </p>
            </div>

            <div
                aria-live="polite"
                aria-atomic="true"
                className={`fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-[#1c1b1b] px-5 py-3 text-xs font-semibold text-white shadow-2xl transition-all duration-200 md:bottom-8 md:text-sm ${
                    feedbackMessage
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-3 opacity-0'
                }`}
            >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF00D4]" aria-hidden="true">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </span>
                {feedbackMessage}
            </div>
        </section>
    );
}
