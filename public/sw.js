// public/sw.js
/**
 * Service Worker para Geobooker PWA
 * Proporciona funcionalidad offline y caché de assets
 */

const CACHE_NAME = 'geobooker-v2.1.1';
const RUNTIME_CACHE = 'geobooker-runtime-v2.1.1';

// Assets críticos para cachear durante instalación
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/images/geobooker-logo.svg',
    '/images/geobooker-logo.png',
    '/images/geobooker-favicon.png',
    '/images/geobooker-app-icon-original.jpg',
    '/assets/icons/icon-48.webp',
    '/assets/icons/icon-72.webp',
    '/assets/icons/icon-96.webp',
    '/assets/icons/icon-128.webp',
    '/assets/icons/icon-192.webp',
    '/assets/icons/icon-256.webp',
    '/assets/icons/icon-512.webp'
];

// Instalación - Cachear assets críticos
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => {
            // Activar inmediatamente sin esperar
            return self.skipWaiting();
        })
    );
});

// Activación - Limpiar cachés viejos
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Eliminar cachés antiguos
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tomar control inmediato de todas las páginas
            return self.clients.claim();
        })
    );
});

// Estrategia de caché: Network First, falling back to Cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    const isDocumentRequest = request.mode === 'navigate' || request.destination === 'document';
    const isBuildAsset = url.pathname.startsWith('/assets/');

    // Solo cachear requests GET
    if (request.method !== 'GET') {
        return;
    }

    // Solo manejar peticiones HTTP/HTTPS (ignorar ws:// o chrome-extension://)
    if (!request.url.startsWith('http')) {
        return;
    }

    // No cachear llamadas a APIs externas
    if (!url.origin.includes(self.location.origin)) {
        return;
    }

    // No cachear llamadas a Supabase o Stripe
    if (url.hostname.includes('supabase') || url.hostname.includes('stripe')) {
        return;
    }

    // Evitar interceptar assets de desarrollo de Vite (HMR)
    if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@react-refresh') || url.pathname.startsWith('/src/')) {
        return;
    }

    if (isDocumentRequest) {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .catch(() => caches.match('/index.html').then((cachedIndex) => cachedIndex || caches.match('/')))
        );
        return;
    }

    if (isBuildAsset) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }

                    return response;
                })
                .catch(() => caches.match(request).then((cachedResponse) => (
                    cachedResponse || new Response('', { status: 404, statusText: 'Asset Not Found' })
                )))
        );
        return;
    }

    // ESTRATEGIA: Network First con Cache Fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Si la respuesta es válida, clonarla y guardarla en caché
                if (response && response.status === 200) {
                    const responseClone = response.clone();

                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                // Si falla el network, intentar servir desde caché
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('[SW] Serving from cache:', request.url);
                        return cachedResponse;
                    }

                    // Fallback para evitar TypeError: Failed to convert value to 'Response'
                    return new Response('', { status: 404, statusText: 'Not Found' });
                });
            })
    );
});

// Mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
