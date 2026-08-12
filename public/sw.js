const CACHE_NAME = 'health-companion-v3';
const APP_SHELL = ['/', '/index.html', '/app.js', '/manifest.json'];
const APP_SHELL_PATHS = new Set(APP_SHELL);

function isCacheableAppShellRequest(request, url) {
  return request.method === 'GET'
    && url.origin === self.location.origin
    && url.search === ''
    && APP_SHELL_PATHS.has(url.pathname);
}

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
        .catch(() => caches.match('/index.html').then(response => response || caches.match('/')))
    );
    return;
  }

  if (!isCacheableAppShellRequest(request, url)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
