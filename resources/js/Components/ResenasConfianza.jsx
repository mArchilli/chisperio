import { GOOGLE_REVIEWS_URL, GoogleIcon, ReviewCard, StarRating } from '@/Components/Landing/ReviewsSection';

/**
 * Bloque de reseñas para las fichas de producto y de combo: suma confianza justo antes
 * de la decisión de compra. `resenas` ya viene elegido al azar desde el servidor
 * (TiendaController::resenasAleatorias), así que cada visita muestra otras.
 */
export default function ResenasConfianza({ resenas = [], compact = false }) {
    if (resenas.length === 0) return null;

    return (
        <section
            className={
                compact
                    ? 'relative mt-8 w-full border-t border-black/10 lg:rounded-xl lg:border lg:bg-white'
                    : 'relative mt-16 w-full px-3 sm:px-4 md:mt-24'
            }
            aria-labelledby="resenas-confianza-title"
        >
            <div
                className={
                    compact
                        ? 'px-4 py-8 sm:px-6 lg:px-8'
                        : 'rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_30px_70px_-48px_rgba(28,27,27,0.5)] sm:rounded-[2.5rem] sm:p-8'
                }
            >
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        {!compact && (
                            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6000ca]">
                                Compra con confianza
                            </p>
                        )}
                        <h2
                            id="resenas-confianza-title"
                            className={
                                compact
                                    ? 'text-lg font-medium text-[#1c1b1b]'
                                    : 'text-[clamp(1.5rem,4vw,2.5rem)] font-black uppercase leading-[0.98] tracking-tight text-[#1c1b1b]'
                            }
                        >
                            {compact ? (
                                'Opiniones sobre Chisperío'
                            ) : (
                                <>
                                    Lo que dicen nuestros <span className="text-[#6000ca]">clientes</span>
                                </>
                            )}
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <GoogleIcon className="h-5 w-5" />
                        {!compact && <StarRating />}
                        <span className="text-xs font-semibold text-[#70757a]">Reseñas de Google</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {resenas.map((resena) => (
                        <ReviewCard key={resena.id} review={resena} className="h-full bg-[#f8f9fa]" />
                    ))}
                </div>

                <div className="mt-6 flex justify-center sm:justify-start">
                    <a
                        href={GOOGLE_REVIEWS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-[#6000ca]/25 bg-white px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                    >
                        Ver todas las reseñas
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.25}
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}
