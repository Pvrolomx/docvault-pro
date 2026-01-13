const CACHE_NAME = 'docvault-pro-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});
