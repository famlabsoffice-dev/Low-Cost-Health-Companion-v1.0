import { test, expect } from '@playwright/test';

test('recovers the persisted AES-GCM CryptoKey from real browser IndexedDB', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const databaseName = `playwright-recovery-${crypto.randomUUID()}`;
    const storeName = 'crypto-keys';
    const keyId = 'device-root-key';

    const open = () => new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const firstDatabase = await open();
    const firstKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const firstJwk = await crypto.subtle.exportKey('jwk', firstKey);
    await new Promise((resolve, reject) => {
      const transaction = firstDatabase.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put({
        id: keyId,
        version: 1,
        algorithm: 'AES-GCM',
        key: firstJwk,
        createdAt: Date.now(),
        rotatedAt: Date.now(),
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    firstDatabase.close();

    const secondDatabase = await open();
    const record = await new Promise((resolve, reject) => {
      const request = secondDatabase.transaction(storeName, 'readonly').objectStore(storeName).get(keyId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    secondDatabase.close();

    const recoveredKey = await crypto.subtle.importKey(
      'jwk',
      record.key,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('real-indexeddb-recovery');
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, recoveredKey, plaintext);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, recoveredKey, ciphertext);

    return {
      persisted: record.id === keyId && record.version === 1 && record.algorithm === 'AES-GCM',
      recovered: new TextDecoder().decode(decrypted),
    };
  });

  expect(result).toEqual({
    persisted: true,
    recovered: 'real-indexeddb-recovery',
  });
});
