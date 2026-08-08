import type { EncryptedSecureRecord, SecureRecord, SecureStorage } from './storageTypes';
import { validateEncryptedSecureRecord, validateSecureRecord } from './storageSchemas';

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

  async set<T>(record: SecureRecord<T> | EncryptedSecureRecord): Promise<void> {
    if (!validateSecureRecord(record) && !validateEncryptedSecureRecord(record)) {
      throw new Error('Invalid secure record');
    }

    const database = await this.init();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async get<T>(id: string): Promise<SecureRecord<T> | EncryptedSecureRecord | null> {
    const database = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () => resolve(request.result ?? null);
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
