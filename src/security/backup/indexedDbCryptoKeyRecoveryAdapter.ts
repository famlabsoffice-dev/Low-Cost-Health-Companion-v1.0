import type { PersistentKeyRecoveryStorageAdapter } from './backupTypes';

export class IndexedDbCryptoKeyRecoveryAdapter implements PersistentKeyRecoveryStorageAdapter {
  private readonly dbName: string;
  private readonly storeName = 'crypto-keys';

  constructor(dbName = 'health-companion-key-recovery') {
    this.dbName = dbName;
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(keyVersion: string, key: JsonWebKey): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(key, keyVersion);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new DOMException('IndexedDB transaction aborted', 'AbortError'));
    });
    db.close();
  }

  async load(keyVersion: string): Promise<JsonWebKey | undefined> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const request = tx.objectStore(this.storeName).get(keyVersion);
        request.onsuccess = () => resolve(request.result as JsonWebKey | undefined);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async remove(keyVersion: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(keyVersion);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new DOMException('IndexedDB transaction aborted', 'AbortError'));
    });
    db.close();
  }

  async importCryptoKey(keyVersion: string): Promise<CryptoKey> {
    const jwk = await this.load(keyVersion);
    if (!jwk) throw new Error(`Crypto recovery key not found: ${keyVersion}`);
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  async saveCryptoKey(keyVersion: string, key: CryptoKey): Promise<void> {
    const jwk = await crypto.subtle.exportKey('jwk', key);
    await this.save(keyVersion, jwk);
  }
}
