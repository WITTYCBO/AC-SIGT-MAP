const CACHE_NAME = 'mapapp-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el recurso si est  en caché o lo busca en la red si no
        return response || fetch(event.request);
      })
      .catch(() => {
        // En caso de estar offline y no tener recurso en caché
        return new Response("Offline (Error de red)");
      })
  );
});
