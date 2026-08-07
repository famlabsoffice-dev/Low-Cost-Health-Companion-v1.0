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
}

export class IndexedDbCryptoKeyStore implements CryptoKeyStore {
  private readonly memory = new Map<string, StoredCryptoKeyRecord>();

  async get(id: string): Promise<StoredCryptoKeyRecord | undefined> {
    return this.memory.get(id);
  }

  async set(record: StoredCryptoKeyRecord): Promise<void> {
    this.memory.set(record.id, record);
  }
}

export class PersistentCryptoKeyProvider {
  constructor(
    private readonly store: CryptoKeyStore = new IndexedDbCryptoKeyStore(),
  ) {}

  async getOrCreate(id = 'device-root-key'): Promise<CryptoKey> {
    const existing = await this.store.get(id);

    if (existing) {
      return this.importKey(existing.encodedKey);
    }

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );

    await this.store.set({
      id,
      version: 1,
      algorithm: 'AES-GCM',
      encodedKey: await this.exportKey(key),
      createdAt: Date.now(),
      rotatedAt: Date.now(),
    });

    return key;
  }

  private async exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  }

  private async importKey(encoded: string): Promise<CryptoKey> {
    const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0));
    return crypto.subtle.importKey(
      'raw',
      bytes,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
  }
}
