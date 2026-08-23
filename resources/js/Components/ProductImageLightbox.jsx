import { useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function ArrowIcon({ className = 'h-5 w-5', flip = false }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={flip ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
        </svg>
    );
}

function ToolbarButton({ onClick, label, children, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
            {children}
        </button>
    );
}

/**
 * Preview de imágenes a pantalla completa con zoom/pan (react-zoom-pan-pinch: rueda
 * y botones +/- en desktop, pellizcar en mobile) y navegación entre varias imágenes.
 * `images` es un array de { ruta, alt }.
 */
export default function ProductImageLightbox({ images, index, onIndexChange, onClose }) {
    const total = images?.length ?? 0;
    const current = images?.[index];

    const goPrev = () => onIndexChange((index - 1 + total) % total);
    const goNext = () => onIndexChange((index + 1) % total);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && total > 1) goPrev();
            if (e.key === 'ArrowRight' && total > 1) goNext();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, total, onClose]);

    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, []);

    if (!current) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Vista ampliada de la imagen"
        >
            {/* Barra superior */}
            <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 sm:px-6">
                <span className="text-sm font-semibold text-white/80">
                    Imagen {index + 1} de {total}
                </span>

                <TransformWrapper key={index} initialScale={1} minScale={1} maxScale={5} centerOnInit doubleClick={{ mode: 'toggle' }}>
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            <div className="flex items-center gap-1">
                                <ToolbarButton label="Alejar" onClick={() => zoomOut()}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                    </svg>
                                </ToolbarButton>
                                <button
                                    type="button"
                                    onClick={() => resetTransform()}
                                    className="px-2 text-xs font-extrabold uppercase tracking-wide text-white/70 transition-colors hover:text-white"
                                >
                                    Reset
                                </button>
                                <ToolbarButton label="Acercar" onClick={() => zoomIn()}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                                    </svg>
                                </ToolbarButton>
                                <ToolbarButton label="Cerrar" onClick={onClose}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </ToolbarButton>
                            </div>

                            {/* Área de la imagen: click afuera (el fondo) cierra, arriba de la imagen no. */}
                            <div
                                className="absolute inset-0 top-14 flex items-center justify-center px-2 pb-16 sm:px-4"
                                onClick={onClose}
                            >
                                {total > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                        aria-label="Imagen anterior"
                                        className="absolute left-2 z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
                                    >
                                        <ArrowIcon flip />
                                    </button>
                                )}

                                <TransformComponent
                                    wrapperStyle={{ width: '100%', height: '100%' }}
                                    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <img
                                        src={`/${current.ruta}`}
                                        alt={current.alt || ''}
                                        className="max-h-[75vh] max-w-[85vw] select-none rounded-xl object-contain shadow-2xl sm:max-h-[80vh]"
                                        onClick={(e) => e.stopPropagation()}
                                        draggable={false}
                                    />
                                </TransformComponent>

                                {total > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                                        aria-label="Siguiente imagen"
                                        className="absolute right-2 z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
                                    >
                                        <ArrowIcon />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </TransformWrapper>
            </div>

            {/* Ayuda inferior */}
            <div className="flex-shrink-0 px-4 pb-4 text-center text-[11px] font-medium text-white/45 sm:pb-6">
                <span className="hidden sm:inline">Desktop: rueda para zoom, arrastrar para mover, flechas para navegar.</span>
                <span className="sm:hidden">Mobile: pellizcá para zoom y arrastrá para mover.</span>
            </div>
        </div>
    );
}
