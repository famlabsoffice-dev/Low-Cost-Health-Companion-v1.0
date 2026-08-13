import { test, expect } from '@playwright/test';

test.describe('PWA install and update lifecycle', () => {
  test('exposes installable manifest and service worker registration', async ({ page }) => {
    await page.goto('/');

    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBe('/manifest.json');

    const serviceWorker = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null;
      const registration = await navigator.serviceWorker.getRegistration('/');
      return registration ? {
        scope: registration.scope,
        updateViaCache: registration.updateViaCache,
      } : null;
    });

    expect(serviceWorker).not.toBeNull();
    expect(serviceWorker.scope).toBe(new URL('/', page.url()).href);
    expect(['imports', 'all', 'none']).toContain(serviceWorker.updateViaCache);
  });

  test('keeps an active service worker ready for the update lifecycle', async ({ page }) => {
    await page.goto('/');

    const lifecycle = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null;

      const registration = await navigator.serviceWorker.ready;
      await registration.update();

      return {
        hasActive: Boolean(registration.active),
        hasWaiting: Boolean(registration.waiting),
        hasInstalling: Boolean(registration.installing),
        hasUpdateMethod: typeof registration.update === 'function',
        activeScriptURL: registration.active?.scriptURL ?? null,
        scope: registration.scope,
        controller: Boolean(navigator.serviceWorker.controller),
        controllerChangeEvent: 'oncontrollerchange' in navigator.serviceWorker,
        updateFoundEvent: 'onupdatefound' in registration,
      };
    });

    expect(lifecycle).not.toBeNull();
    expect(lifecycle.hasActive).toBeTruthy();
    expect(lifecycle.hasUpdateMethod).toBeTruthy();
    expect(lifecycle.activeScriptURL).toContain('/sw.js');
    expect(lifecycle.scope).toBe(new URL('/', page.url()).href);
    expect(lifecycle.controller).toBeTruthy();
    expect(lifecycle.controllerChangeEvent).toBeTruthy();
    expect(lifecycle.updateFoundEvent).toBeTruthy();
  });
});
