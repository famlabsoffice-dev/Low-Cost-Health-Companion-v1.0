import { expect, test } from '@playwright/test';

async function reloadOffline(page, context, browserName) {
  if (browserName === 'webkit') {
    await context.route('**/*', route => route.abort('failed'));
    await page.goto(page.url());
    return;
  }

  await context.setOffline(true);
  await page.reload();
}

test.describe('PWA offline runtime', () => {
  test('loads the app shell and registers the service worker', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
  });

  test('starts offline from the cached app shell and keeps IndexedDB runtime state', async ({ page, context, browserName }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker?.controller);

    const beforeOffline = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(beforeOffline.ready).toBe(true);
    expect(beforeOffline.bootCount).toBeGreaterThanOrEqual(1);

    await reloadOffline(page, context, browserName);

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');

    const offlineState = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(offlineState.ready).toBe(true);
    expect(offlineState.bootCount).toBeGreaterThan(beforeOffline.bootCount);
  });
});
