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
  getVersion(id: string, version: number): Promise<StoredCryptoKeyRecord | undefined>;
  set(record: StoredCryptoKeyRecord): Promise<void>;
  setVersion(record: StoredCryptoKeyRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export class IndexedDbCryptoKeyStore implements CryptoKeyStore {
  private readonly currentStoreName = 'crypto-keys';
  private readonly versionStoreName = 'crypto-key-versions';
  private readonly databaseName: string;

  constructor(databaseName = 'low-cost-health-companion-security') {
    this.databaseName = databaseName;
  }

  private async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 2);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.currentStoreName)) {
          db.createObjectStore(this.currentStoreName, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.versionStoreName)) {
          db.createObjectStore(this.versionStoreName, { keyPath: ['id', 'version'] });
        }
        if (event.oldVersion < 2) {
          const transaction = request.transaction;
          if (!transaction) throw new Error('Crypto key migration transaction unavailable');
          const currentStore = transaction.objectStore(this.currentStoreName);
          const versionStore = transaction.objectStore(this.versionStoreName);
          const cursorRequest = currentStore.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            versionStore.put(cursor.value as StoredCryptoKeyRecord);
            cursor.continue();
          };
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
        const request = db.transaction(this.currentStoreName, 'readonly').objectStore(this.currentStoreName).get(id);
        request.onsuccess = () => resolve(request.result as StoredCryptoKeyRecord | undefined);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async getVersion(id: string, version: number): Promise<StoredCryptoKeyRecord | undefined> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(this.versionStoreName, 'readonly').objectStore(this.versionStoreName).get([id, version]);
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
        const transaction = db.transaction([this.currentStoreName, this.versionStoreName], 'readwrite');
        transaction.objectStore(this.currentStoreName).put(record);
        transaction.objectStore(this.versionStoreName).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }

  async setVersion(record: StoredCryptoKeyRecord): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.versionStoreName, 'readwrite');
        transaction.objectStore(this.versionStoreName).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.currentStoreName, this.versionStoreName], 'readwrite');
        transaction.objectStore(this.currentStoreName).delete(id);
        const versions = transaction.objectStore(this.versionStoreName).openCursor();
        versions.onsuccess = () => {
          const cursor = versions.result;
          if (!cursor) return;
          const record = cursor.value as StoredCryptoKeyRecord;
          if (record.id === id) cursor.delete();
          cursor.continue();
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
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

  async getVersion(id: string, version: number): Promise<CryptoKey> {
    this.assertVersion(version);
    const record = await this.store.getVersion(id, version);
    if (!record) throw new Error(`Crypto key version was not found: ${id}:${version}`);
    return this.importKey(record.key);
  }

  async getCurrentVersion(id = 'device-root-key'): Promise<number> {
    const current = await this.store.get(id);
    if (!current) {
      await this.createAndStore(id, 1);
      return 1;
    }
    this.assertVersion(current.version);
    return current.version;
  }

  async rotate(id = 'device-root-key'): Promise<CryptoKey> {
    const current = await this.store.get(id);
    const nextVersion = (current?.version ?? 0) + 1;
    this.assertVersion(nextVersion);
    return this.createAndStore(id, nextVersion);
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
    this.assertVersion(version);
    const imported = await this.importKey(key);
    const now = Date.now();
    const record: StoredCryptoKeyRecord = {
      id,
      version,
      algorithm: 'AES-GCM',
      key,
      createdAt: now,
      rotatedAt: now,
    };
    const current = await this.store.get(id);
    if (!current || version >= current.version) {
      await this.store.set(record);
    } else {
      await this.store.setVersion(record);
    }
    return imported;
  }

  async remove(id = 'device-root-key'): Promise<void> {
    await this.store.delete(id);
  }

  private async createAndStore(id: string, version: number): Promise<CryptoKey> {
    this.assertVersion(version);
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('jwk', key);
    const now = Date.now();
    await this.store.set({ id, version, algorithm: 'AES-GCM', key: exported, createdAt: now, rotatedAt: now });
    return key;
  }

  private async importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  private assertVersion(version: number): void {
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error(`Invalid crypto key version: ${version}`);
    }
  }
}
