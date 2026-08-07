export interface CryptoKeyProvider {
  getKey(): Promise<CryptoKey>;
  clearKey(): Promise<void>;
}

const STORAGE_KEY = 'lhc.crypto.key.v1';

function encode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function decode(value: string): ArrayBuffer {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;
}

export class PersistentStorageCryptoKeyProvider implements CryptoKeyProvider {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}

  async getKey(): Promise<CryptoKey> {
    const existing = this.storage.getItem(STORAGE_KEY);
    if (existing) {
      return crypto.subtle.importKey('raw', decode(existing), 'AES-GCM', false, ['encrypt', 'decrypt']);
    }

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const raw = await crypto.subtle.exportKey('raw', key);
    this.storage.setItem(STORAGE_KEY, encode(raw));
    return key;
  }

  async clearKey(): Promise<void> {
    this.storage.removeItem(STORAGE_KEY);
  }
}
