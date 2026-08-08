import { test, expect } from '@playwright/test';

test('real browser IndexedDB CryptoKey restore path', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const dbName = 'health-companion-e2e';
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('jwk', key);

    await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keys');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keys', 'readwrite');
        tx.objectStore('keys').put(exported, 'active');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const restored = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keys');
        const get = tx.objectStore('keys').get('active');
        get.onsuccess = () => {
          db.close();
          resolve(get.result);
        };
        get.onerror = () => reject(get.error);
      };
      request.onerror = () => reject(request.error);
    });

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      restored,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    return cryptoKey.type;
  });

  expect(result).toBe('secret');
});
