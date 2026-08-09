import type { EncryptedSecureRecord, SecureStorage } from './storageTypes';
import { validateEncryptedSecureRecord } from './storageSchemas';

const DB_NAME = 'health-companion-secure';
const STORE_NAME = 'secure-records';
const VERSION = 1;

export class IndexedDbSecureStorage implements SecureStorage {
  private database?: IDBDatabase;

  private async init(): Promise<IDBDatabase> {
    if (this.database) return this.database;

    this.database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.database;
  }

  async set(record: EncryptedSecureRecord): Promise<void> {
    if (!validateEncryptedSecureRecord(record)) {
      throw new Error('Invalid encrypted secure record');
    }

    const database = await this.init();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Secure storage transaction aborted'));
    });
  }

  async get(id: string): Promise<EncryptedSecureRecord | null> {
    const database = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => {
        const value = request.result ?? null;
        if (value !== null && !validateEncryptedSecureRecord(value)) {
          reject(new Error('Invalid encrypted secure record'));
          return;
        }
        resolve(value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: string): Promise<void> {
    const database = await this.init();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clear(): Promise<void> {
    const database = await this.init();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
