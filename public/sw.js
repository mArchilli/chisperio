// Service worker de la PWA. Vive en la raíz de /public para que su scope sea todo el sitio.
//
// Estrategia deliberadamente conservadora (tienda con sesión, carrito y CSRF):
//  - Navegaciones (HTML / Inertia): siempre red; solo si no hay conexión se muestra /offline.html.
//    Nunca se cachea HTML ni respuestas XHR de Inertia, para no servir páginas, precios o tokens viejos.
//  - /build/assets/* (nombres con hash) y los íconos: cache-first, son inmutables.
//  - Todo lo demás (POST, API, panel, imágenes de productos, etc.) pasa directo a la red.
// Al cambiar la lógica, subir VERSION para invalidar las cachés anteriores.

const VERSION = 'v1';
const CACHE_SHELL = `chisperio-shell-${VERSION}`;
const CACHE_STATIC = `chisperio-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [
    OFFLINE_URL,
    '/images/logo-chisperio.png',
    '/images/favicons/web-app-manifest-192x192.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_SHELL)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k.startsWith('chisperio-') && k !== CACHE_SHELL && k !== CACHE_STATIC)
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

const isStaticAsset = (url) =>
    url.pathname.startsWith('/build/assets/') || url.pathname.startsWith('/images/favicons/');

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match(OFFLINE_URL)),
        );
        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(
            caches.open(CACHE_STATIC).then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                const response = await fetch(request);
                if (response.ok) cache.put(request, response.clone());
                return response;
            }),
        );
    }
});
