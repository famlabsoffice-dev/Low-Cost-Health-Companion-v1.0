import type { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

export interface DeviceRestoreBundle {
  version: 1;
  keyId: string;
  keyVersion: number;
  algorithm: 'PBKDF2-AES-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const ITERATIONS = 310000;
const KEY_LENGTH = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export class DeviceRestoreService {
  constructor(private readonly provider: PersistentCryptoKeyProvider) {}

  async createBundle(keyId: string, passphrase: string): Promise<DeviceRestoreBundle> {
    assertPassphrase(passphrase);
    const keyVersion = await this.provider.getCurrentVersion(keyId);
    const jwk = await this.provider.exportKeyVersion(keyId, keyVersion);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const wrappingKey = await deriveWrappingKey(passphrase, salt);
    const plaintext = new TextEncoder().encode(JSON.stringify({ keyId, keyVersion, jwk }));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, plaintext);

    return {
      version: 1,
      keyId,
      keyVersion,
      algorithm: 'PBKDF2-AES-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: ITERATIONS,
      salt: encodeBase64(salt),
      iv: encodeBase64(iv),
      ciphertext: encodeBase64(new Uint8Array(encrypted)),
    };
  }

  async restoreBundle(bundle: DeviceRestoreBundle, passphrase: string): Promise<CryptoKey> {
    validateBundle(bundle);
    assertPassphrase(passphrase);
    const salt = decodeBase64(bundle.salt);
    const iv = decodeBase64(bundle.iv);
    const ciphertext = decodeBase64(bundle.ciphertext);
    const wrappingKey = await deriveWrappingKey(passphrase, salt, bundle.iterations);

    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, ciphertext);
    } catch {
      throw new Error('Device restore authentication failed');
    }

    let recovered: { keyId: string; keyVersion: number; jwk: JsonWebKey };
    try {
      recovered = JSON.parse(new TextDecoder().decode(plaintext)) as typeof recovered;
    } catch {
      throw new Error('Invalid device restore payload');
    }

    if (recovered.keyId !== bundle.keyId || recovered.keyVersion !== bundle.keyVersion) {
      throw new Error('Device restore metadata mismatch');
    }

    return this.provider.importKeyForVersion(recovered.keyId, recovered.jwk, recovered.keyVersion);
  }
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array, iterations = ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

function validateBundle(bundle: DeviceRestoreBundle): void {
  if (!bundle || bundle.version !== 1 || bundle.algorithm !== 'PBKDF2-AES-GCM' || bundle.kdf !== 'PBKDF2-SHA-256') {
    throw new Error('Invalid device restore bundle');
  }
  if (typeof bundle.keyId !== 'string' || bundle.keyId.length === 0) throw new Error('Invalid device restore key id');
  if (!Number.isSafeInteger(bundle.keyVersion) || bundle.keyVersion < 1) throw new Error('Invalid device restore key version');
  if (!Number.isSafeInteger(bundle.iterations) || bundle.iterations < 100000) throw new Error('Invalid device restore KDF parameters');
  if (decodeBase64(bundle.salt).length !== SALT_BYTES) throw new Error('Invalid device restore salt');
  if (decodeBase64(bundle.iv).length !== IV_BYTES) throw new Error('Invalid device restore IV');
  if (decodeBase64(bundle.ciphertext).length === 0) throw new Error('Invalid device restore ciphertext');
}

function assertPassphrase(passphrase: string): void {
  if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('Device restore passphrase must contain at least 12 characters');
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url value');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
