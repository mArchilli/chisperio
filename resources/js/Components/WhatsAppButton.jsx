import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

const EXCLUDED_PREFIXES = [
    '/carrito',
    '/checkout',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/confirm-password',
    '/verify-email',
    '/dashboard',
    '/admin',
    '/profile',
];

const WHATSAPP_URL = `https://wa.me/5491133973222?text=${encodeURIComponent('¡Hola! Necesito ayuda con mi pedido 😊')}`;

function shouldShow(path) {
    return !EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
}

export default function WhatsAppButton() {
    const [visible, setVisible] = useState(() => shouldShow(window.location.pathname));

    useEffect(() => {
        return router.on('navigate', (event) => {
            setVisible(shouldShow(new URL(event.detail.page.url, window.location.origin).pathname));
        });
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 group">
            {/* Tooltip — solo desktop */}
            <div className="
                hidden md:flex items-center
                absolute bottom-full right-0 mb-3
                bg-white text-gray-800 text-sm font-semibold
                px-4 py-2.5 rounded-2xl
                shadow-xl border border-gray-100
                whitespace-nowrap pointer-events-none
                opacity-0 translate-y-2
                group-hover:opacity-100 group-hover:translate-y-0
                transition-all duration-200
            ">
                ¿Necesitás ayuda? ¡Contactanos!
                <span className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45 block" />
            </div>

            <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
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
            </a>
        </div>
    );
}
