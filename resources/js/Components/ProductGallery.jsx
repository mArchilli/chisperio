import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProductImageLightbox from '@/Components/ProductImageLightbox';

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

export default function ProductGallery({ imagenes, videos, titulo }) {
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
