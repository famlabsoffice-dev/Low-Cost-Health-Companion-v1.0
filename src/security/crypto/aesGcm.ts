import type { CryptoEngine, CryptoKeyProvider, EncryptedPayload } from './cryptoTypes';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(value: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return bytes.buffer;
}

export class AesGcmCryptoEngine implements CryptoEngine {
  constructor(private readonly keyProvider: CryptoKeyProvider) {}

  async encrypt(data: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.keyProvider.getKey(),
      encoder.encode(data),
    );

    return {
      ciphertext: toBase64(encrypted),
      iv: toBase64(iv.buffer),
      algorithm: 'AES-GCM',
      version: 1,
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(fromBase64(payload.iv)),
      },
      await this.keyProvider.getKey(),
      fromBase64(payload.ciphertext),
    );

    return decoder.decode(decrypted);
  }
}
