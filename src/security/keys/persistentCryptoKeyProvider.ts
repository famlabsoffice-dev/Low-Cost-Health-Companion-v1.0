export interface StoredCryptoKeyRecord {
  id: string;
  version: number;
  algorithm: 'AES-GCM';
  encodedKey: string;
  createdAt: number;
  rotatedAt: number;
}

export interface CryptoKeyStore {
  get(id: string): Promise<StoredCryptoKeyRecord | undefined>;
  set(record: StoredCryptoKeyRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export class IndexedDbCryptoKeyStore implements CryptoKeyStore {
  private readonly databaseName = 'low-cost-health-companion-security';
  private readonly storeName = 'crypto-keys';

  private async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(this.storeName, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(id: string): Promise<StoredCryptoKeyRecord | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName).objectStore(this.storeName).get(id);
      request.onsuccess = () => resolve(request.result as StoredCryptoKeyRecord | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async set(record: StoredCryptoKeyRecord): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export class PersistentCryptoKeyProvider {
  constructor(private readonly store: CryptoKeyStore = new IndexedDbCryptoKeyStore()) {}

  async getOrCreate(id = 'device-root-key'): Promise<CryptoKey> {
    const existing = await this.store.get(id);
    if (existing) return this.importKey(existing.encodedKey);

    return this.createAndStore(id, 1);
  }

  async rotate(id = 'device-root-key'): Promise<CryptoKey> {
    const current = await this.store.get(id);
    return this.createAndStore(id, (current?.version ?? 0) + 1);
  }

  private async createAndStore(id: string, version: number): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const now = Date.now();
    await this.store.set({
      id,
      version,
      algorithm: 'AES-GCM',
      encodedKey: await this.exportKey(key),
      createdAt: now,
      rotatedAt: now,
    });
    return key;
  }

  private async exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  }

  private async importKey(encoded: string): Promise<CryptoKey> {
    const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0));
    return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }
}
