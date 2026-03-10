const CACHE_NAME = 'math-burst-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/Game.js',
  './js/LevelManager.js',
  './js/UI.js',
  './js/AudioManager.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Install Event: Cache all essential assets for offline use
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch Event: Serve from cache if available, otherwise hit the network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            // Cache hit - return the saved response
            if (response) {
                return response;
            }
            return fetch(event.request);
        }
    ));
});

// Activate Event: Clean up old caches when a new service worker version is installed
self.addEventListener('activate', (event) => {
    const cacheAllowlist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheAllowlist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Delete outdated caches
                    }
                })
            );
        })
    );
});
