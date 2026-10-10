import { useEffect, useRef, useState } from 'react';
import { tiempoRelativo } from '@/lib/tiempoRelativo';

export const GOOGLE_REVIEWS_URL = 'https://www.google.com/search?q=chisperio&oq=chisperio&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRg8MgYIAhBFGDwyBwgDEAAYgAQyBggEEAAYHjIGCAUQRRg8MgYIBhBFGDwyBggHEEUYPNIBCDQ4ODlqMGo3qAIAsAIA&sourceid=chrome&source=chrome.ob&ie=UTF-8#lrd=0x8f7e9e5929cf69c9:0xd23641ad42e2ddaf,1,,,,';

function getReviewsPerPage() {
    if (typeof window === 'undefined') return 1;
    if (window.matchMedia('(min-width: 1024px)').matches) return 5;
    if (window.matchMedia('(min-width: 640px)').matches) return 2;
    return 1;
}

export function GoogleIcon({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

function Star({ filled = true }) {
    return (
        <svg className={`h-4 w-4 fill-current ${filled ? '' : 'text-[#dadce0]'}`} viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    );
}

export function StarRating({ compact = false, value = 5 }) {
    return (
        <div className={`flex text-[#fbbc04] ${compact ? 'gap-px' : 'gap-0.5'}`} aria-label={`${value} de 5 estrellas`}>
            {Array.from({ length: 5 }, (_, index) => <Star key={index} filled={index < value} />)}
        </div>
    );
}

/**
 * Card de una reseña. `review` es una fila de `resenas` (nombre, iniciales, meta, texto,
 * puntuacion, fecha, color_avatar). Exportada para reusarla en la vista previa del
 * formulario del admin, que así muestra exactamente lo que va a ver el cliente.
 */
export function ReviewCard({ review, className = '' }) {
    return (
        <article className={`admin-card flex flex-col rounded-xl border border-[#dadce0] bg-white p-5 ${className}`}>
            <div className="flex items-start gap-3">
                <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: review.color_avatar || '#1a73e8' }}
                >
                    {review.iniciales}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-snug text-[#202124]">
                        {review.nombre}
                    </h3>
                    {review.meta && (
                        <p className="mt-0.5 text-xs leading-snug text-[#70757a]">
                            {review.meta}
                        </p>
                    )}
                </div>

                <GoogleIcon className="h-5 w-5 flex-shrink-0" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                <StarRating compact value={review.puntuacion} />
                <span className="text-xs text-[#70757a]">{tiempoRelativo(review.fecha)}</span>
            </div>

            {review.texto && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#3c4043]">
                    {review.texto}
                </p>
            )}
        </article>
    );
}

function NavArrow({ direction, onClick }) {
    const isPrevious = direction === 'previous';

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dadce0] bg-white text-[#3c4043] shadow-sm transition-colors hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
            aria-label={isPrevious ? 'Ver reseñas anteriores' : 'Ver reseñas siguientes'}
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={isPrevious ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
            </svg>
        </button>
    );
}

export default function ReviewsSection({ resenas = [] }) {
    const [reviewsPerPage, setReviewsPerPage] = useState(getReviewsPerPage);
    const [page, setPage] = useState(0);
    const stripRef = useRef(null);
    // En mobile (1 reseña por "página") se muestra un carrusel deslizable con la reseña
    // anterior y la siguiente asomando por los costados; en pantallas más grandes sigue
    // la grilla paginada de siempre.
    const isCarousel = reviewsPerPage === 1;

    const scrollToReview = (index, behavior = 'smooth') => {
        const strip = stripRef.current;
        const slide = strip?.children[index];
        if (!strip || !slide) return;
        strip.scrollTo({ left: slide.offsetLeft - (strip.clientWidth - slide.offsetWidth) / 2, behavior });
    };

    // El índice activo sale de cuál slide queda más cerca del centro del carrusel.
    const handleStripScroll = () => {
        const strip = stripRef.current;
        if (!strip) return;
        const center = strip.scrollLeft + strip.clientWidth / 2;
        let nearest = 0;
        let nearestDistance = Infinity;
        Array.from(strip.children).forEach((slide, index) => {
            const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = index;
            }
        });
        setPage((current) => (current === nearest ? current : nearest));
    };

    useEffect(() => {
        const updateReviewsPerPage = () => setReviewsPerPage(getReviewsPerPage());

        window.addEventListener('resize', updateReviewsPerPage);
        return () => window.removeEventListener('resize', updateReviewsPerPage);
    }, []);

    const totalPages = Math.ceil(resenas.length / reviewsPerPage);

    useEffect(() => {
        setPage((currentPage) => Math.max(0, Math.min(currentPage, totalPages - 1)));
    }, [totalPages]);

    const startIndex = page * reviewsPerPage;
    const visibleReviews = resenas.slice(startIndex, startIndex + reviewsPerPage);
    const goToPage = (offset) => {
        const next = (page + offset + totalPages) % totalPages;
        setPage(next);
        if (isCarousel) scrollToReview(next);
    };

    // Al pasar a modo carrusel (por ejemplo al achicar la ventana), se ubica en la reseña actual.
    useEffect(() => {
        if (isCarousel) scrollToReview(page, 'auto');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCarousel]);

    if (resenas.length === 0) return null;

    return (
        <section id="resenas" className="bg-[#f8f9fa] px-6 pb-12 pt-6 md:px-10 md:pb-16 md:pt-8 lg:px-12 xl:px-16" aria-labelledby="reviews-title">
            <div className="w-full">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 id="reviews-title" className="text-[clamp(1.8rem,4vw,3.25rem)] font-black uppercase leading-[0.96] tracking-tight text-[#1c1b1b]">
                            Lo que dicen nuestros <span className="text-[#6000ca]">clientes</span>
                        </h2>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <GoogleIcon className="h-6 w-6" />
                            <span className="text-sm font-semibold text-[#3c4043]">Excelente</span>
                            <StarRating />
                            <span className="text-sm text-[#70757a]">5.0 · +80 reseñas de Google</span>
                        </div>
                    </div>
                </div>

                {isCarousel ? (
                    <div
                        ref={stripRef}
                        onScroll={handleStripScroll}
                        className="no-scrollbar relative -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9%] py-3"
                        aria-roledescription="carrusel"
                        aria-label="Reseñas de clientes"
                    >
                        {resenas.map((review, index) => (
                            <div
                                key={review.id}
                                className={`flex w-[82%] flex-shrink-0 snap-center snap-always transition-all duration-300 motion-reduce:transition-none ${
                                    index === page ? 'z-10 scale-100 opacity-100' : 'scale-[0.92] opacity-60'
                                }`}
                            >
                                <ReviewCard
                                    review={review}
                                    className="w-full"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {visibleReviews.map((review) => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                )}

                <p className="sr-only" aria-live="polite">
                    Mostrando reseñas {startIndex + 1} a {startIndex + visibleReviews.length} de {resenas.length}
                </p>

                <div className="mt-7 flex flex-col items-center justify-between gap-5 sm:flex-row">
                    <a
                        href={GOOGLE_REVIEWS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#6000ca] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_12px_24px_-14px_rgba(96,0,202,0.9)] transition-colors hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                    >
                        Ver todas las reseñas
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                        </svg>
                    </a>

                    <div className="flex items-center gap-3" aria-label="Controles de reseñas">
                        <NavArrow direction="previous" onClick={() => goToPage(-1)} />
                        <span className="min-w-14 text-center text-xs font-semibold text-[#70757a]" aria-hidden="true">
                            {page + 1} / {totalPages}
                        </span>
                        <NavArrow direction="next" onClick={() => goToPage(1)} />
                    </div>
                </div>
            </div>
        </section>
    );
}
