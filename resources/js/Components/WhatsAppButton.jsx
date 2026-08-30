import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { useScrolledPast } from '@/hooks/useScrolledPast';
import { useWhatsAppSucursal } from '@/Context/WhatsAppSucursalContext';

const EXCLUDED_PREFIXES = [
    '/carrito',
    '/checkout',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/confirm-password',
    '/verify-email',
    '/dashboard',
    '/admin',
    '/profile',
];

const WHATSAPP_MESSAGE = '¡Hola! Necesito ayuda con mi pedido 😊';

// Cuánto esperar, una vez que el botón ya está visible, antes de mostrar la leyenda.
const CALLOUT_DELAY_MS = 1500;
const CALLOUT_DISMISSED_KEY = 'whatsappCalloutDismissed';

function shouldShow(path) {
    return !EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
}

export default function WhatsAppButton() {
    const { abrirSelectorWhatsApp } = useWhatsAppSucursal();
    const [visible, setVisible] = useState(() => shouldShow(window.location.pathname));
    // No aparece hasta que el usuario scrollea un poco, para no taparle el hero apenas
    // entra al sitio (mismo criterio que el botón flotante del carrito).
    const scrolled = useScrolledPast();
    const [calloutReady, setCalloutReady] = useState(false);
    const [calloutDismissed, setCalloutDismissed] = useState(
        () => typeof window !== 'undefined' && sessionStorage.getItem(CALLOUT_DISMISSED_KEY) === 'true'
    );
    // "Pegajoso": una vez que cruzó el umbral de scroll una vez, esto se queda en true
    // aunque el usuario vuelva a subir. Si el timer de la leyenda dependiera de
    // `scrolled` directamente, cualquier rebote hacia arriba (común en mobile, sobre
    // todo con el bounce del emulador) cancela el timeout con el cleanup del effect y
    // la leyenda nunca llega a dispararse.
    const [hasScrolledOnce, setHasScrolledOnce] = useState(false);

    useEffect(() => {
        return router.on('navigate', (event) => {
            setVisible(shouldShow(new URL(event.detail.page.url, window.location.origin).pathname));
        });
    }, []);

    useEffect(() => {
        if (scrolled) setHasScrolledOnce(true);
    }, [scrolled]);

    // Arranca una sola vez, apenas cruzó el umbral por primera vez, y llega a
    // completarse pase lo que pase con el scroll después.
    useEffect(() => {
        if (!hasScrolledOnce || calloutDismissed) return undefined;
        const timer = setTimeout(() => setCalloutReady(true), CALLOUT_DELAY_MS);
        return () => clearTimeout(timer);
    }, [hasScrolledOnce, calloutDismissed]);

    const dismissCallout = () => {
        setCalloutDismissed(true);
        try {
            sessionStorage.setItem(CALLOUT_DISMISSED_KEY, 'true');
        } catch {}
    };

    if (!visible || !scrolled) return null;

    const showCallout = calloutReady && !calloutDismissed;

    return (
        <div className="fixed bottom-6 md:bottom-8 right-4 md:right-8 z-40">
            {/* Leyenda: aparece sola un instante después de que el botón se muestra,
                se puede cerrar con la cruz y queda cerrada por el resto de la sesión. */}
            {showCallout && (
                <div className="absolute bottom-full right-0 mb-3 flex w-56 items-start gap-2 rounded-2xl border border-gray-100 bg-white py-2.5 pl-4 pr-2 text-gray-800 shadow-xl [animation:chisperio-callout-enter_220ms_ease-out] motion-reduce:[animation:none]">
                    <button
                        type="button"
                        onClick={() => abrirSelectorWhatsApp(WHATSAPP_MESSAGE)}
                        className="flex-1 text-left text-sm font-semibold leading-snug hover:text-[#1ebe5c]"
                    >
                        ¿Necesitás asesoramiento? Hacé clic acá
                    </button>
                    <button
                        type="button"
                        onClick={dismissCallout}
                        aria-label="Cerrar mensaje"
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <span className="absolute -bottom-1.5 right-6 block h-3 w-3 rotate-45 border-b border-r border-gray-100 bg-white" />
                </div>
            )}

            <style>{`
                @keyframes chisperio-callout-enter {
                    from { opacity: 0; transform: translate3d(0, 0.5rem, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
            `}</style>

            <button
                type="button"
                onClick={() => abrirSelectorWhatsApp(WHATSAPP_MESSAGE)}
                aria-label="Contactar por WhatsApp"
                className="
                    flex items-center justify-center
                    w-14 h-14 rounded-full
                    bg-[#25D366]
                    shadow-[0_4px_24px_rgba(37,211,102,0.45)]
                    hover:bg-[#1ebe5c] hover:scale-110
                    active:scale-95
                    transition-all duration-200
                "
            >
                <svg viewBox="0 0 32 32" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.003 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.354.617 4.562 1.693 6.476L2.667 29.333l7.061-1.852A13.267 13.267 0 0 0 16.003 29.333C23.369 29.333 29.333 23.369 29.333 16S23.369 2.667 16.003 2.667zm0 24.267a11.12 11.12 0 0 1-5.667-1.553l-.406-.24-4.19 1.099 1.12-4.086-.265-.42A11.12 11.12 0 0 1 4.882 16c0-6.135 4.992-11.12 11.12-11.12S27.12 9.865 27.12 16s-4.986 10.934-11.117 10.934zm6.1-8.294c-.334-.167-1.974-.974-2.28-1.085-.306-.112-.53-.167-.752.167-.224.334-.865 1.085-1.06 1.308-.194.224-.39.251-.723.084-.334-.167-1.408-.52-2.682-1.657-.991-.886-1.66-1.98-1.854-2.314-.194-.334-.021-.514.146-.68.15-.149.334-.39.501-.585.167-.195.224-.334.334-.557.112-.224.056-.419-.028-.585-.084-.167-.752-1.813-1.03-2.481-.272-.651-.548-.563-.752-.574-.194-.01-.419-.012-.64-.012-.224 0-.585.084-.89.418-.306.334-1.168 1.14-1.168 2.782s1.196 3.228 1.362 3.451c.167.224 2.354 3.595 5.705 5.044.797.344 1.419.55 1.904.703.8.255 1.53.219 2.106.133.642-.096 1.974-.807 2.252-1.587.278-.78.278-1.45.195-1.587-.083-.14-.306-.224-.64-.39z" />
                </svg>
            </button>
        </div>
    );
}
