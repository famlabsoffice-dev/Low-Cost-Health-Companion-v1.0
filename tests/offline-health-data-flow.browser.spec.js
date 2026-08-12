import { expect, test } from '@playwright/test';

test.describe('offline health data persistence', () => {
  test('retains encrypted health data across offline reload', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');

    const result = await page.evaluate(async () => {
      const runtime = window.healthCompanionRuntime;
      if (!runtime || typeof runtime.saveHealthRecord !== 'function' || typeof runtime.listHealthRecords !== 'function') {
        return { supported: false };
      }

      const record = {
        id: `offline-e2e-${Date.now()}`,
        type: 'measurement',
        value: { measurement: 'heart-rate', value: 72 },
      };
      await runtime.saveHealthRecord(record);
      return { supported: true, id: record.id };
    });

    expect(result.supported).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('[data-testid="runtime-status"]')).toHaveText('ready');

    const persisted = await page.evaluate(async (id) => {
      const records = await window.healthCompanionRuntime.listHealthRecords();
      return records.find((record) => record.id === id) ?? null;
    }, result.id);

    expect(persisted).not.toBeNull();
    expect(persisted.value).toEqual({ measurement: 'heart-rate', value: 72 });
  });
});
