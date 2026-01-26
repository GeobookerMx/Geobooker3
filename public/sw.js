// public/sw.js
/**
 * Service Worker para Geobooker PWA
 * Proporciona funcionalidad offline y caché de assets
 */

const CACHE_NAME = 'geobooker-v1.0.0';
const RUNTIME_CACHE = 'geobooker-runtime';

// Assets críticos para cachear durante instalación
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/images/geobooker-logo.svg',
    '/images/geobooker-logo.png',
    '/images/geobooker-favicon.png'
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

    // Solo cachear requests GET
    if (request.method !== 'GET') {
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

                    // Si no hay caché y es una navegación, servir página offline
                    if (request.destination === 'document') {
                        return caches.match('/');
                    }
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
