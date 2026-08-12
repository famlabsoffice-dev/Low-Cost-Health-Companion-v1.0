import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serviceWorker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

describe('Service Worker', () => {
  it('pre-caches the complete application shell and activates immediately', () => {
    expect(serviceWorker).toContain("const APP_SHELL = ['/', '/index.html', '/app.js', '/manifest.json'];");
    expect(serviceWorker).toContain('cache.addAll(APP_SHELL)');
    expect(serviceWorker).toContain('self.skipWaiting()');
    expect(serviceWorker).toContain('self.clients.claim()');
  });

  it('serves navigations from the cached app shell when offline without caching dynamic responses', () => {
    expect(serviceWorker).toContain("if (request.mode === 'navigate')");
    expect(serviceWorker).toContain("caches.match('/index.html')");
    expect(serviceWorker).toContain("caches.match('/')");
    expect(serviceWorker).not.toContain("cache.put('/index.html', clone)");
  });

  it('limits runtime caching to exact shell paths without query strings', () => {
    expect(serviceWorker).toContain('const APP_SHELL_PATHS = new Set(APP_SHELL);');
    expect(serviceWorker).toContain("url.search === ''");
    expect(serviceWorker).toContain('APP_SHELL_PATHS.has(url.pathname)');
    expect(serviceWorker).toContain('if (!isCacheableAppShellRequest(request, url))');
    expect(serviceWorker).not.toContain('caches.open(CACHE_NAME).then(cache => cache.put(request, clone))');
  });

  it('does not cache cross-origin requests', () => {
    expect(serviceWorker).toContain('if (url.origin !== self.location.origin) return;');
  });
});
