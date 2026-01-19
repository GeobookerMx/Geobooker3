// public/sw.js
/**
 * Geobooker Service Worker
 * Handlers for PWA and Push Notifications
 */

const CACHE_NAME = 'geobooker-v1';

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/images/geobooker-logo.svg',
                '/images/geobooker-favicon.png'
            ]);
        })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Fetch event - simple network-first strategy for dynamic content
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip Vite dev server routes and hot module replacement
    if (url.includes('@vite') || url.includes('@react-refresh') ||
        url.includes('hot-update') || url.includes('__vite') ||
        url.includes('supabase.co') || url.includes('.hot-update.')) {
        return;
    }

    // For development, just pass through without intercepting
    if (url.includes('localhost:5173') && (url.includes('/src/') || url.includes('node_modules'))) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return response;
            })
            .catch(async () => {
                try {
                    const cachedResponse = await caches.match(event.request);
                    // Return cached response or a proper fallback
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // For navigation requests, return the cached index.html (SPA fallback)
                    if (event.request.mode === 'navigate') {
                        const indexResponse = await caches.match('/index.html');
                        if (indexResponse) {
                            return indexResponse;
                        }
                    }
                } catch (e) {
                    console.error('SW cache error:', e);
                }
                // Return a proper error response instead of undefined
                return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {
        title: 'Geobooker',
        body: 'Tienes una nueva actualización en tu cuenta.',
        icon: '/images/geobooker-favicon.png'
    };

    const options = {
        body: data.body,
        icon: data.icon || '/images/geobooker-favicon.png',
        badge: '/images/geobooker-favicon.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
