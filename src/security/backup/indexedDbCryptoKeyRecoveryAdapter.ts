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
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName);
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
    });
  }

  async load(keyVersion: string): Promise<JsonWebKey | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).get(keyVersion);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(keyVersion: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(keyVersion);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
