import type { CryptoEngine, CryptoKeyProvider, EncryptedPayload } from './cryptoTypes';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(value: string): ArrayBuffer {
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error('Invalid base64 crypto payload');
  }
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return bytes.buffer;
  } catch {
    throw new Error('Invalid base64 crypto payload');
  }
}

function validateKeyVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(`Invalid crypto key version: ${version}`);
  }
}

function validateEncryptedPayload(payload: EncryptedPayload): void {
  if (!payload || payload.algorithm !== 'AES-GCM') {
    throw new Error('Unsupported encrypted payload algorithm');
  }
  if (payload.version !== 1) {
    throw new Error(`Unsupported encrypted payload version: ${payload.version}`);
  }
  validateKeyVersion(payload.keyVersion);
  const iv = new Uint8Array(fromBase64(payload.iv));
  if (iv.byteLength !== 12) {
    throw new Error(`Invalid AES-GCM IV length: ${iv.byteLength}`);
  }
  const ciphertext = new Uint8Array(fromBase64(payload.ciphertext));
  if (ciphertext.byteLength === 0) {
    throw new Error('Encrypted payload ciphertext is empty');
  }
}

export class AesGcmCryptoEngine implements CryptoEngine {
  constructor(private readonly keyProvider: CryptoKeyProvider) {}

  async encrypt(data: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyVersion = await this.keyProvider.getCurrentKeyVersion();
    validateKeyVersion(keyVersion);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.keyProvider.getKey(keyVersion),
      encoder.encode(data),
    );

    return {
      ciphertext: toBase64(encrypted),
      iv: toBase64(iv.buffer),
      algorithm: 'AES-GCM',
      version: 1,
      keyVersion,
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    validateEncryptedPayload(payload);
    const iv = new Uint8Array(fromBase64(payload.iv));
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      await this.keyProvider.getKey(payload.keyVersion),
      fromBase64(payload.ciphertext),
    );

    return decoder.decode(decrypted);
  }
}
