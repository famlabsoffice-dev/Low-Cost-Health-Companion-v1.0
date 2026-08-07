import type { SecureRecord, SecureStorage } from './storageTypes';

interface EncryptedEnvelope {
  id: string;
  ciphertext: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export class EncryptedSecureStorage implements SecureStorage {
  private readonly records = new Map<string, EncryptedEnvelope>();

  constructor(private readonly key: CryptoKey) {}

  async set<T>(record: SecureRecord<T>): Promise<void> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(record.payload));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      this.key,
      this.toArrayBuffer(encoded),
    );

    this.records.set(record.id, {
      id: record.id,
      ciphertext: this.toBase64(new Uint8Array(encrypted)),
      iv: this.toBase64(iv),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    });
  }

  async get<T>(id: string): Promise<SecureRecord<T> | null> {
    const stored = this.records.get(id);
    if (!stored) return null;

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(this.fromBase64(stored.iv)) },
      this.key,
      this.toArrayBuffer(this.fromBase64(stored.ciphertext)),
    );

    return {
      id: stored.id,
      payload: JSON.parse(new TextDecoder().decode(decrypted)) as T,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      version: stored.version,
    };
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  private toBase64(value: Uint8Array): string {
    return btoa(String.fromCharCode(...value));
  }

  private fromBase64(value: string): Uint8Array {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }

  private toArrayBuffer(value: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(value.byteLength);
    new Uint8Array(buffer).set(value);
    return buffer;
  }
}
