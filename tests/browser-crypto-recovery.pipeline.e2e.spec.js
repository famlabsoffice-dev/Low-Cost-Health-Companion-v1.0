import { test, expect } from '@playwright/test';

test('browser IndexedDB CryptoKey recovery restores and rotates a real AES-GCM backup', async ({ context, page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const recoveryDb = 'browser-crypto-recovery-e2e';
    const backupDb = 'browser-crypto-backup-e2e';
    const recoveryStore = 'crypto-keys';
    const backupStore = 'backups';
    const keyVersion = 'key-v1';
    const nextKeyVersion = 'key-v2';

    const open = (name, store, keyPath) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store, keyPath ? { keyPath } : undefined);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const put = async (databaseName, storeName, value, key) => {
      const db = await open(databaseName, storeName);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    };

    const oldKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const plaintext = 'productive-indexeddb-browser-restore';
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, oldKey, encoded);
    const exported = await crypto.subtle.exportKey('jwk', oldKey);

    await put(recoveryDb, recoveryStore, exported, keyVersion);
    await put(backupDb, backupStore, {
      id: 'backup-v1',
      version: 2,
      keyVersion,
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)),
    }, 'backup-v1');

    return { recoveryDb, backupDb, recoveryStore, backupStore, keyVersion, nextKeyVersion };
  });

  const secondPage = await context.newPage();
  await secondPage.goto('/');
  const restored = await secondPage.evaluate(async ({ recoveryDb, backupDb, recoveryStore, backupStore, keyVersion, nextKeyVersion }) => {
    const open = (name, store) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const get = async (databaseName, storeName, key) => {
      const db = await open(databaseName, storeName);
      const value = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return value;
    };

    const put = async (databaseName, storeName, value, key) => {
      const db = await open(databaseName, storeName);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    };

    const record = await get(backupDb, backupStore, 'backup-v1');
    const jwk = await get(recoveryDb, recoveryStore, keyVersion);
    const recoveredKey = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
      recoveredKey,
      new Uint8Array(record.ciphertext),
    );
    const restoredText = new TextDecoder().decode(decrypted);

    const rotatedKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const rotatedIv = crypto.getRandomValues(new Uint8Array(12));
    const rotatedCiphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: rotatedIv },
      rotatedKey,
      new TextEncoder().encode(restoredText),
    );
    await put(recoveryDb, recoveryStore, await crypto.subtle.exportKey('jwk', rotatedKey), nextKeyVersion);
    await put(backupDb, backupStore, {
      id: 'backup-v2',
      version: 2,
      keyVersion: nextKeyVersion,
      iv: Array.from(rotatedIv),
      ciphertext: Array.from(new Uint8Array(rotatedCiphertext)),
    }, 'backup-v2');

    const rotatedRecord = await get(backupDb, backupStore, 'backup-v2');
    const rotatedJwk = await get(recoveryDb, recoveryStore, nextKeyVersion);
    const restoredRotatedKey = await crypto.subtle.importKey('jwk', rotatedJwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    const rotatedPlaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(rotatedRecord.iv) },
      restoredRotatedKey,
      new Uint8Array(rotatedRecord.ciphertext),
    );

    return {
      restoredText,
      rotatedText: new TextDecoder().decode(rotatedPlaintext),
      originalKeyVersion: record.keyVersion,
      rotatedKeyVersion: rotatedRecord.keyVersion,
      persistedOriginalKey: Boolean(jwk?.kty === 'oct' && jwk?.alg === 'A256GCM'),
      persistedRotatedKey: Boolean(rotatedJwk?.kty === 'oct' && rotatedJwk?.alg === 'A256GCM'),
    };
  }, result);

  await secondPage.close();

  expect(restored).toEqual({
    restoredText: 'productive-indexeddb-browser-restore',
    rotatedText: 'productive-indexeddb-browser-restore',
    originalKeyVersion: 'key-v1',
    rotatedKeyVersion: 'key-v2',
    persistedOriginalKey: true,
    persistedRotatedKey: true,
  });
});
