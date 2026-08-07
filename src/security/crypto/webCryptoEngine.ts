import type { CryptoEngine, CryptoKeyProvider, EncryptedPayload } from './cryptoTypes';

export class WebCryptoEngine implements CryptoEngine {
  constructor(private readonly keyProvider: CryptoKeyProvider) {}

  async encrypt(data: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      await this.keyProvider.getKey(),
      toArrayBuffer(encoded),
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
      { name: 'AES-GCM', iv: toArrayBuffer(fromBase64(payload.iv)) },
      await this.keyProvider.getKey(),
      toArrayBuffer(fromBase64(payload.ciphertext)),
    );

    return new TextDecoder().decode(decrypted);
  }
}

function toBase64(value: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    binary += String.fromCharCode(...value.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}
