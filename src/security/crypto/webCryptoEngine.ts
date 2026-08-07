import type { CryptoEngine, CryptoKeyProvider, EncryptedPayload } from './cryptoTypes';

export class WebCryptoEngine implements CryptoEngine {
  constructor(private readonly keyProvider: CryptoKeyProvider) {}

  async encrypt(data: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.keyProvider.getKey(),
      encoded,
    );

    return {
      ciphertext: toBase64(new Uint8Array(encrypted)),
      iv: toBase64(iv),
      algorithm: 'AES-GCM',
      version: 1,
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(payload.iv) },
      await this.keyProvider.getKey(),
      fromBase64(payload.ciphertext),
    );

    return new TextDecoder().decode(decrypted);
  }
}

function toBase64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
