const CACHE_NAME = 'mapapp-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Estrategia "Network First" (Intenta red, recae en caché)
  event.respondWith(
    fetch(event.request).then(response => {
      const respCopy = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, respCopy);
      });
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
