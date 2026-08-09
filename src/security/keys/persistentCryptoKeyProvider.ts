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
      request.onerror = () => reject(request.error ?? new Error('Crypto key database could not be opened'));
      request.onblocked = () => reject(new Error('Crypto key database upgrade is blocked'));
    });
  }

  async get(id: string): Promise<StoredCryptoKeyRecord | undefined> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(this.currentStoreName, 'readonly').objectStore(this.currentStoreName).get(id);
        request.onsuccess = () => resolve(request.result as StoredCryptoKeyRecord | undefined);
        request.onerror = () => reject(request.error ?? new Error(`Crypto key lookup failed: ${id}`));
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
        request.onerror = () => reject(request.error ?? new Error(`Crypto key version lookup failed: ${id}:${version}`));
      });
    } finally {
      db.close();
    }
  }

  async set(record: StoredCryptoKeyRecord): Promise<void> {
    validateStoredRecord(record);
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.currentStoreName, this.versionStoreName], 'readwrite');
        transaction.objectStore(this.currentStoreName).put(record);
        transaction.objectStore(this.versionStoreName).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error(`Crypto key persistence failed: ${record.id}:${record.version}`));
        transaction.onabort = () => reject(transaction.error ?? new Error(`Crypto key persistence aborted: ${record.id}:${record.version}`));
      });
    } finally {
      db.close();
    }
  }

  async setVersion(record: StoredCryptoKeyRecord): Promise<void> {
    validateStoredRecord(record);
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.versionStoreName, 'readwrite');
        transaction.objectStore(this.versionStoreName).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error(`Crypto key version persistence failed: ${record.id}:${record.version}`));
        transaction.onabort = () => reject(transaction.error ?? new Error(`Crypto key version persistence aborted: ${record.id}:${record.version}`));
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
        transaction.onerror = () => reject(transaction.error ?? new Error(`Crypto key deletion failed: ${id}`));
        transaction.onabort = () => reject(transaction.error ?? new Error(`Crypto key deletion aborted: ${id}`));
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
    if (existing) return this.importStoredRecord(existing, id, existing.version);
    return this.createAndStore(id, 1);
  }

  async getVersion(id: string, version: number): Promise<CryptoKey> {
    assertVersion(version);
    const record = await this.store.getVersion(id, version);
    if (!record) throw new Error(`Crypto key version was not found: ${id}:${version}`);
    return this.importStoredRecord(record, id, version);
  }

  async getCurrentVersion(id = 'device-root-key'): Promise<number> {
    const current = await this.store.get(id);
    if (!current) {
      await this.createAndStore(id, 1);
      return 1;
    }
    validateStoredRecord(current);
    return current.version;
  }

  async rotate(id = 'device-root-key'): Promise<CryptoKey> {
    const current = await this.store.get(id);
    if (current) validateStoredRecord(current);
    const nextVersion = (current?.version ?? 0) + 1;
    assertVersion(nextVersion);
    return this.createAndStore(id, nextVersion);
  }

  async exportKey(id = 'device-root-key'): Promise<JsonWebKey> {
    const existing = await this.store.get(id);
    if (!existing) {
      await this.createAndStore(id, 1);
      const created = await this.store.get(id);
      if (!created) throw new Error(`Crypto key was not persisted: ${id}`);
      validateStoredRecord(created);
      return created.key;
    }
    validateStoredRecord(existing);
    return existing.key;
  }

  async importKeyForVersion(id: string, key: JsonWebKey, version: number): Promise<CryptoKey> {
    assertVersion(version);
    const imported = await importAesGcmKey(key, id, version);
    const existingVersion = await this.store.getVersion(id, version);
    if (existingVersion && JSON.stringify(existingVersion.key) !== JSON.stringify(key)) {
      throw new Error(`Crypto key version conflict: ${id}:${version}`);
    }
    const now = Date.now();
    const record: StoredCryptoKeyRecord = {
      id,
      version,
      algorithm: 'AES-GCM',
      key,
      createdAt: existingVersion?.createdAt ?? now,
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
    assertVersion(version);
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('jwk', key);
    const now = Date.now();
    const record: StoredCryptoKeyRecord = {
      id,
      version,
      algorithm: 'AES-GCM',
      key: exported,
      createdAt: now,
      rotatedAt: now,
    };
    await this.store.set(record);
    return key;
  }

  private async importStoredRecord(record: StoredCryptoKeyRecord, id: string, version: number): Promise<CryptoKey> {
    validateStoredRecord(record);
    if (record.id !== id || record.version !== version) {
      throw new Error(`Crypto key record mismatch: ${id}:${version}`);
    }
    return importAesGcmKey(record.key, id, version);
  }
}

async function importAesGcmKey(jwk: JsonWebKey, id: string, version: number): Promise<CryptoKey> {
  try {
    validateJwk(jwk);
    return await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  } catch {
    throw new Error(`Invalid AES-GCM crypto key: ${id}:${version}`);
  }
}

function validateStoredRecord(record: StoredCryptoKeyRecord): void {
  if (!record || typeof record.id !== 'string' || record.id.length === 0) {
    throw new Error('Invalid crypto key record id');
  }
  assertVersion(record.version);
  if (record.algorithm !== 'AES-GCM') {
    throw new Error(`Unsupported crypto key algorithm: ${record.algorithm}`);
  }
  if (!Number.isFinite(record.createdAt) || !Number.isFinite(record.rotatedAt) || record.createdAt <= 0 || record.rotatedAt <= 0) {
    throw new Error(`Invalid crypto key timestamps: ${record.id}:${record.version}`);
  }
  validateJwk(record.key);
}

function validateJwk(jwk: JsonWebKey): void {
  if (!jwk || jwk.kty !== 'oct' || typeof jwk.k !== 'string' || jwk.k.length === 0) {
    throw new Error('Invalid AES-GCM JWK');
  }
  if (jwk.alg !== undefined && jwk.alg !== 'A256GCM') {
    throw new Error(`Unsupported AES-GCM JWK algorithm: ${jwk.alg}`);
  }
}

function assertVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(`Invalid crypto key version: ${version}`);
  }
}
