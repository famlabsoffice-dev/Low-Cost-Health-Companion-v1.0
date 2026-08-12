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

test.describe('offline runtime persistence', () => {
  test('retains runtime state across offline reload', async ({ page, context, browserName }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');

    const beforeOffline = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(beforeOffline.ready).toBe(true);
    expect(beforeOffline.bootCount).toBeGreaterThanOrEqual(1);

    await reloadOffline(page, context, browserName);

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');

    const offlineState = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(offlineState.ready).toBe(true);
    expect(offlineState.bootCount).toBeGreaterThan(beforeOffline.bootCount);

    const storageState = await page.evaluate(async () => {
      const request = indexedDB.open('low-cost-health-companion', 2);
      return await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const database = request.result;
          const stores = Array.from(database.objectStoreNames);
          database.close();
          resolve(stores);
        };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    });

    expect(storageState).toContain('secure-storage');
    expect(storageState).toContain('runtime');
  });
});
