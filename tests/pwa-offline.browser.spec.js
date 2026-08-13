import { test, expect } from '@playwright/test';

test.describe('offline runtime', () => {
  test('boots app shell, service worker and IndexedDB runtime', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('runtime-status')).toHaveText('Bereit');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

    const runtime = await page.evaluate(async () => {
      const state = await window.healthCompanionRuntime.getBootState();
      const registration = await navigator.serviceWorker.ready;
      return {
        state,
        serviceWorkerActive: Boolean(registration.active),
        controller: Boolean(navigator.serviceWorker.controller),
      };
    });

    expect(runtime.state.ready).toBe(true);
    expect(runtime.state.bootCount).toBeGreaterThanOrEqual(1);
    expect(runtime.serviceWorkerActive).toBe(true);
    expect(runtime.controller).toBe(true);
  });

  test('starts from cached app shell while offline and persists IndexedDB boot state', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByTestId('runtime-status')).toHaveText('Bereit');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

    const before = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('runtime-status')).toHaveText('Offline bereit');

    const after = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(after.ready).toBe(true);
    expect(after.bootCount).toBe(before.bootCount + 1);
  });
});
