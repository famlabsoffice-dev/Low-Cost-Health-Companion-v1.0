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
}

const DB_NAME = 'health-companion-secure';
const STORE = 'encrypted_records';

export class IndexedDbSecureStorage {
  private db?: IDBDatabase;

  async init(): Promise<void> {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(record: SecureRecord<T>, key: CryptoKey): Promise<void> {
    if (!this.db) await this.init();
    const encrypted = await encryptData(JSON.stringify(record.payload), key);
    await this.write({ id: record.id, encrypted, createdAt: record.createdAt, updatedAt: record.updatedAt });
  }

  async get<T>(id: string, key: CryptoKey): Promise<T | null> {
    if (!this.db) await this.init();
    const item = await this.read(id);
    if (!item) return null;
    return JSON.parse(await decryptData(item.encrypted, key)) as T;
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
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
