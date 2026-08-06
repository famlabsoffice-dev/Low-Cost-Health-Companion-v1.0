import { encryptData, decryptData } from '../crypto/aesGcm';

export interface SecureRecord<T> {
  id: string;
  payload: T;
  createdAt: number;
  updatedAt: number;
}

interface StoredRecord {
  id: string;
  encrypted: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

const DB_NAME = 'health-companion-secure';
const STORE = 'encrypted_records';
const VERSION = 2;

export class IndexedDbSecureStorage {
  private db?: IDBDatabase;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(record: SecureRecord<T>, key: CryptoKey): Promise<void> {
    await this.init();
    const encrypted = await encryptData(JSON.stringify(record.payload), key);
    await this.write({ ...record, encrypted, version: VERSION });
  }

  async get<T>(id: string, key: CryptoKey): Promise<T | null> {
    await this.init();
    const item = await this.read(id);
    if (!item) return null;
    return JSON.parse(await decryptData(item.encrypted, key)) as T;
  }

  async remove(id: string): Promise<void> {
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private write(value: StoredRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private read(id: string): Promise<StoredRecord | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
