export interface StoredCryptoKeyRecord {
  id: string;
  version: number;
  algorithm: 'AES-GCM';
  key: JsonWebKey;
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
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(id: string): Promise<StoredCryptoKeyRecord | undefined> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(id);
        request.onsuccess = () => resolve(request.result as StoredCryptoKeyRecord | undefined);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async set(record: StoredCryptoKeyRecord): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(this.storeName, 'readwrite').objectStore(this.storeName).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }
}

export class PersistentCryptoKeyProvider {
  constructor(private readonly store: CryptoKeyStore = new IndexedDbCryptoKeyStore()) {}

  async getOrCreate(id = 'device-root-key'): Promise<CryptoKey> {
    const existing = await this.store.get(id);
    if (existing) return this.importKey(existing.key);
    return this.createAndStore(id, 1);
  }

  async rotate(id = 'device-root-key'): Promise<CryptoKey> {
    const current = await this.store.get(id);
    return this.createAndStore(id, (current?.version ?? 0) + 1);
  }

  async exportKey(id = 'device-root-key'): Promise<JsonWebKey> {
    const existing = await this.store.get(id);
    if (!existing) {
      await this.createAndStore(id, 1);
      const created = await this.store.get(id);
      if (!created) throw new Error(`Crypto key was not persisted: ${id}`);
      return created.key;
    }
    return existing.key;
  }

  async importKeyForVersion(id: string, key: JsonWebKey, version: number): Promise<CryptoKey> {
    const imported = await this.importKey(key);
    const now = Date.now();
    await this.store.set({
      id,
      version,
      algorithm: 'AES-GCM',
      key,
      createdAt: now,
      rotatedAt: now,
    });
    return imported;
  }

  async remove(id = 'device-root-key'): Promise<void> {
    await this.store.delete(id);
  }

  private async createAndStore(id: string, version: number): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('jwk', key);
    const now = Date.now();
    await this.store.set({
      id,
      version,
      algorithm: 'AES-GCM',
      key: exported,
      createdAt: now,
      rotatedAt: now,
    });
    return key;
  }

  private async importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }
}
