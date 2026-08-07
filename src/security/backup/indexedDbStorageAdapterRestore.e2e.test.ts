import { expect, test } from '@playwright/test';

const backupId = 'restore-e2e-backup';

test('restores encrypted backup through IndexedDB storage adapter flow', async ({ page }) => {
  await page.goto('about:blank');

  const result = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('health-companion-backups', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('backups');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const stored = { version: 2, keyVersion: 'test-key', payload: { data: 'encrypted-restore' } };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('backups', 'readwrite');
      tx.objectStore('backups').put(stored, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction('backups', 'readonly');
      const request = tx.objectStore('backups').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, backupId);

  expect(result).toEqual({ version: 2, keyVersion: 'test-key', payload: { data: 'encrypted-restore' } });
});
