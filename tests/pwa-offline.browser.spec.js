import { test, expect } from '@playwright/test';

async function reloadOffline(page, context, browserName) {
  if (browserName === 'webkit') {
    await context.route('**/*', route => route.abort('failed'));
    await page.goto(page.url());
    return;
  }

  await context.setOffline(true);
  await page.reload();
}

test.describe('offline runtime', () => {
  test('boots app shell, service worker and IndexedDB runtime', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('runtime-status')).toHaveText('ready');
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

  test('starts from cached app shell while offline and persists IndexedDB boot state', async ({ page, context, browserName }) => {
    await page.goto('/');
    await expect(page.getByTestId('runtime-status')).toHaveText('ready');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

    const before = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    await reloadOffline(page, context, browserName);

    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('runtime-status')).toHaveText('ready');

    const after = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(after.ready).toBe(true);
    expect(after.bootCount).toBe(before.bootCount + 1);
  });
});
