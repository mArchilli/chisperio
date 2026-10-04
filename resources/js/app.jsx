import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './Context/CartContext';
import { WhatsAppSucursalProvider } from './Context/WhatsAppSucursalContext';
import WhatsAppButton from './Components/WhatsAppButton';
import CartButton from './Components/CartButton';
import { isTrackablePath } from './lib/pixel';

const appName = import.meta.env.VITE_APP_NAME || 'Chisperío';

// Meta Pixel: el base code del <head> ya dispara el PageView de la primera carga;
// acá solo se cuentan las navegaciones posteriores de Inertia (no hay recarga).
// isTrackablePath excluye el panel y el auth: mantener sincronizada su lista con
// resources/views/partials/meta-pixel.blade.php.
let lastUrl = window.location.pathname + window.location.search;
router.on('navigate', (event) => {
    const url = event.detail.page.url;
    if (url !== lastUrl) {
        lastUrl = url;
        if (isTrackablePath(url)) window.fbq?.('track', 'PageView');
    }
});

createInertiaApp({
    // Cada página pasa solo su nombre en <Head title="…">; acá se le agrega la
    // marca una sola vez. Sin título (caso raro), la pestaña muestra solo "Chisperío".
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <CartProvider>
                <WhatsAppSucursalProvider>
                    <Toaster position="top-center" />
                    <App {...props}>
                        {({ Component, props: pageProps, key }) => (
                            <>
                                <Component key={key} {...pageProps} />
                                <CartButton />
                                <WhatsAppButton />
                            </>
                        )}
                    </App>
                </WhatsAppSucursalProvider>
            </CartProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
