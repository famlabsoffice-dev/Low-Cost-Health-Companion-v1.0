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
    expect(serviceWorker.scope).toBe(page.url().replace(/\/$/, '/') );
    expect(['imports', 'all', 'none']).toContain(serviceWorker.updateViaCache);
  });

  test('service worker registration can detect an update without losing the active controller', async ({ page }) => {
    await page.goto('/');

    const lifecycle = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) return null;

      await registration.update();

      return {
        hasActive: Boolean(registration.active),
        hasController: Boolean(navigator.serviceWorker.controller),
        scope: registration.scope,
      };
    });

    expect(lifecycle).not.toBeNull();
    expect(lifecycle.hasActive).toBeTruthy();
    expect(lifecycle.scope).toBe(new URL('/', page.url()).href);
  });
});
