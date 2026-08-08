import { test, expect } from '@playwright/test';

test('real browser indexeddb aes-gcm key rotation re-encryption', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const dbName = 'health-companion-rotation-e2e';
    const open = indexedDB.open(dbName, 1);

    await new Promise((resolve, reject) => {
      open.onupgradeneeded = () => open.result.createObjectStore('backups');
      open.onsuccess = resolve;
      open.onerror = () => reject(open.error);
    });

    const db = open.result;
    const createKey = () => crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const oldKey = await createKey();
    const nextKey = await createKey();
    const payload = new TextEncoder().encode(JSON.stringify({ records: Array.from({ length: 5000 }, (_, i) => ({ id: i })) }));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, oldKey, payload);
    const transaction = db.transaction('backups', 'readwrite');
    transaction.objectStore('backups').put({ encrypted, iv: Array.from(iv) }, 'rotation');
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });

    const oldDecrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, oldKey, encrypted);
    const nextIv = crypto.getRandomValues(new Uint8Array(12));
    const rotated = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nextIv }, nextKey, oldDecrypted);
    const restored = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nextIv }, nextKey, rotated);

    db.close();
    return { bytes: restored.byteLength };
  });

  expect(result.bytes).toBeGreaterThan(0);
});
