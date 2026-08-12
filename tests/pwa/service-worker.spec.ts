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

  it('serves navigations from the cached app shell when offline', () => {
    expect(serviceWorker).toContain('if (request.mode === \'navigate\')');
    expect(serviceWorker).toContain("caches.match('/index.html')");
    expect(serviceWorker).toContain("caches.match('/')");
  });

  it('uses cache-first for previously cached same-origin GET assets and caches successful misses', () => {
    expect(serviceWorker).toContain("if (url.origin !== self.location.origin) return;");
    expect(serviceWorker).toContain('caches.match(request)');
    expect(serviceWorker).toContain('cache.put(request, clone)');
  });
});
