const CACHE_NAME = 'health-companion-v3';
const APP_SHELL = ['/', '/index.html', '/app.js', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone))
            );
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then(response => response || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response.ok) return response;

        const clone = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        );
        return response;
      });
    })
  );
});
