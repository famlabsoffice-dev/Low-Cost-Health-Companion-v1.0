import { test, expect } from '@playwright/test';

test('browser runtime supports IndexedDB', async ({ page }) => {
  await page.goto('about:blank');

  const result = await page.evaluate(async () => {
    const request = indexedDB.open('health-companion-test', 1);

    return await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        request.result.createObjectStore('records', { keyPath: 'id' });
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('records', 'readwrite');
        transaction.objectStore('records').put({ id: 'runtime-check', status: 'ok' });
        transaction.oncomplete = () => resolve(true);
      };

      request.onerror = () => reject(request.error);
    });
  });

  expect(result).toBe(true);
});
