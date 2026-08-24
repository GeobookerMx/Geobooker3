// public/sw.js
/**
 * Service Worker para Geobooker PWA
 * Proporciona funcionalidad offline y caché de assets
 */

const CACHE_VERSION = 'v2.3.0';
const CACHE_NAME = `geobooker-${CACHE_VERSION}`;
const RUNTIME_CACHE = `geobooker-runtime-${CACHE_VERSION}`;
const CRITICAL_PRECACHE_ASSETS = new Set(['/index.html']);

// Assets críticos para cachear durante instalación
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
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

const precacheAsset = async (cache, asset) => {
    const isDocument = asset === '/' || asset === '/index.html';
    const request = new Request(asset, {
        cache: isDocument ? 'no-store' : 'reload'
    });
    const response = await fetch(request);

    if (!response.ok) {
        throw new Error(`${asset} returned ${response.status}`);
    }

    await cache.put(asset, response);
    return asset;
};

// Instalación - Cachear assets críticos
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const results = await Promise.allSettled(
            PRECACHE_ASSETS.map((asset) => precacheAsset(cache, asset))
        );

        const failedAssets = results
            .map((result, index) => ({ result, asset: PRECACHE_ASSETS[index] }))
            .filter(({ result }) => result.status === 'rejected');

        failedAssets.forEach(({ asset, result }) => {
            console.warn('[SW] Optional precache failed:', asset, result.reason);
        });

        const criticalFailure = failedAssets.find(({ asset }) => CRITICAL_PRECACHE_ASSETS.has(asset));
        if (criticalFailure) {
            throw new Error(`[SW] Critical app shell unavailable: ${criticalFailure.asset}`);
        }

        // The chunk recovery flow reloads stale clients after an atomic deploy.
        // Activating immediately ensures the repaired worker replaces broken older versions.
        await self.skipWaiting();
    })());
});

// Activación - Limpiar cachés viejos
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Eliminar solo cachés antiguos propiedad de Geobooker.
                    if (cacheName.startsWith('geobooker-') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
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
                .then((response) => {
                    if (response?.ok && response.headers.get('content-type')?.includes('text/html')) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
                    }
                    return response;
                })
                .catch(() => caches.match('/index.html').then((cachedIndex) => cachedIndex || caches.match('/')))
        );
        return;
    }

    if (isBuildAsset) {
        event.respondWith(
            fetch(request)
                .then(async (response) => {
                    const contentType = response?.headers.get('content-type') || '';
                    const expectsStyle = url.pathname.endsWith('.css');
                    const hasExpectedType = expectsStyle
                        ? contentType.includes('text/css')
                        : contentType.includes('javascript');

                    if (response?.ok && hasExpectedType) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });

                        return response;
                    }

                    // A cached file with the exact same content hash is compatible
                    // with the running client and can bridge an atomic deploy safely.
                    // Netlify can rewrite a missing asset to index.html with status 200;
                    // never cache or execute that HTML response as JavaScript/CSS.
                    return (await caches.match(request)) || new Response('', {
                        status: 404,
                        statusText: 'Build Asset Not Found'
                    });
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
