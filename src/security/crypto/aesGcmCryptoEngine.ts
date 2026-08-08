import type { CryptoEngine, CryptoKeyProvider, EncryptedPayload } from './cryptoTypes';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export class AesGcmCryptoEngine implements CryptoEngine {
  constructor(private readonly provider: CryptoKeyProvider) {}

  async encrypt(data: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyVersion = await this.provider.getCurrentKeyVersion();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.provider.getKey(keyVersion),
      encoder.encode(data),
    );
    return { ciphertext: encode(new Uint8Array(encrypted)), iv: encode(iv), algorithm: 'AES-GCM', version: 1, keyVersion };
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decode(payload.iv) },
      await this.provider.getKey(payload.keyVersion),
      decode(payload.ciphertext),
    );
    return decoder.decode(decrypted);
  }
}

export async function importAesGcmKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}
