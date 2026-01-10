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
    // Skip non-GET requests and Supabase/API calls for caching
    if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
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
