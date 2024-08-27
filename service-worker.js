// Define the cache name and the assets to cache
const CACHE_NAME = 'm110-sticker-cache-v1';
const ASSETS_TO_CACHE = [
    '/', // Cache the root page
    '/index.html',
    // '/styles.css',
    '/print.js',
    'https://cdn.jsdelivr.net/npm/qrcode-svg@1.1.0/dist/qrcode.min.js' // External library
];

// Install event: Open the cache and store all the assets
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(ASSETS_TO_CACHE).catch(function (error) {
                console.error('Failed to cache assets:', error);
            });
        })
    );
});

// Fetch event: Serve assets from the cache if available, otherwise fetch from the network
self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (cachedResponse) {
            if (cachedResponse) {
                return cachedResponse; // Return the cached version
            }
            return fetch(event.request); // Fetch from network if not cached
        }).catch(function (error) {
            console.error('Fetch failed:', error);
        })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // Remove old caches
                    }
                })
            );
        })
    );
});
