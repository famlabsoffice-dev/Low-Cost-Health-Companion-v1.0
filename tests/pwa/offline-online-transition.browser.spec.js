import { expect, test } from '@playwright/test';

test.describe('PWA offline/online transition', () => {
  test('updates connection state across offline and online transitions without losing runtime state', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');

    const initial = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(initial.ready).toBe(true);

    await context.setOffline(true);
    await expect(page.locator('#connection-status')).toHaveText('Offline');
    const offlineState = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(offlineState).toEqual(initial);

    await context.setOffline(false);
    await expect(page.locator('#connection-status')).toHaveText('Online');
    const onlineState = await page.evaluate(() => window.healthCompanionRuntime.getBootState());
    expect(onlineState).toEqual(initial);
  });
});
