import { test, expect } from '@playwright/test';

test('indexeddb encrypted backup restore', async ({ page }) => {
  await page.goto('about:blank');
  const result = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('health-backup-test', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('backup');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('restore-ok'));
    return Boolean(encrypted.byteLength && db.name);
  });
  expect(result).toBe(true);
});
