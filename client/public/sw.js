const CACHE = 'ape-kade-shell-v3';
const SHELL = ['/', '/manifest.webmanifest', '/app-icon.svg'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key)),
    )));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/')) return;

    // Route documents are always network-first and are never stored under protected
    // paths such as /users. Offline navigation falls back only to the public shell.
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(() => caches.match('/')));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
            if (response.ok && url.origin === self.location.origin) {
                const copy = response.clone();
                caches.open(CACHE).then(cache => cache.put(event.request, copy));
            }
            return response;
        })),
    );
});