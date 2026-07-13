import { useEffect } from 'react';

export default function ImageLightbox({ src, alt, onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!src) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-white/80 hover:text-white transition-colors"
                aria-label="Cerrar"
            >
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <img
                src={src}
                alt={alt || ''}
                className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
