import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './Context/CartContext';
import WhatsAppButton from './Components/WhatsAppButton';
import CartButton from './Components/CartButton';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <CartProvider>
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
            </CartProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
