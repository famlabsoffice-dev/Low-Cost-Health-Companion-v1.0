import { describe, expect, it } from 'vitest';
import { AesGcmCryptoEngine } from '../src/security/crypto/aesGcm';
import { StaticCryptoKeyProvider } from '../src/security/crypto/cryptoKeyProvider';
import type { EncryptedPayload } from '../src/security/crypto/cryptoTypes';

async function createKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

describe('AesGcmCryptoEngine WebCrypto integration', () => {
  it('encrypts and decrypts payloads with the same key', async () => {
    const engine = new AesGcmCryptoEngine(
      new StaticCryptoKeyProvider(await createKey()),
    );

    const encrypted = await engine.encrypt('secure health record');
    const decrypted = await engine.decrypt(encrypted);

    expect(decrypted).toBe('secure health record');
    expect(encrypted.algorithm).toBe('AES-GCM');
  });

  it('rejects decrypt with a different key', async () => {
    const engine = new AesGcmCryptoEngine(
      new StaticCryptoKeyProvider(await createKey()),
    );
    const wrongKeyEngine = new AesGcmCryptoEngine(
      new StaticCryptoKeyProvider(await createKey()),
    );

    const encrypted = await engine.encrypt('private payload');

    await expect(wrongKeyEngine.decrypt(encrypted)).rejects.toThrow();
  });

  it('rejects manipulated ciphertext', async () => {
    const engine = new AesGcmCryptoEngine(
      new StaticCryptoKeyProvider(await createKey()),
    );

    const encrypted = await engine.encrypt('immutable payload');
    const manipulated = {
      ...encrypted,
      ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA`,
    };

    await expect(engine.decrypt(manipulated)).rejects.toThrow();
  });

  it('rejects invalid key versions before key lookup', async () => {
    const provider = new StaticCryptoKeyProvider(await createKey());
    const engine = new AesGcmCryptoEngine(provider);
    const encrypted = await engine.encrypt('key version validation');
    const tamper = (changes: Record<string, unknown>): EncryptedPayload =>
      ({ ...encrypted, ...changes }) as unknown as EncryptedPayload;

    await expect(engine.decrypt(tamper({ keyVersion: 0 }))).rejects.toThrow(
      'Invalid crypto key version: 0',
    );
    await expect(engine.decrypt(tamper({ keyVersion: -1 }))).rejects.toThrow(
      'Invalid crypto key version: -1',
    );
    await expect(engine.decrypt(tamper({ keyVersion: 1.5 }))).rejects.toThrow(
      'Invalid crypto key version: 1.5',
    );
    await expect(
      engine.decrypt(tamper({ keyVersion: Number.MAX_SAFE_INTEGER + 1 })),
    ).rejects.toThrow('Invalid crypto key version');
  });

  it('rejects unsupported payload versions and malformed AES-GCM metadata', async () => {
    const engine = new AesGcmCryptoEngine(
      new StaticCryptoKeyProvider(await createKey()),
    );
    const encrypted = await engine.encrypt('metadata validation');
    const tamper = (changes: Record<string, unknown>): EncryptedPayload =>
      ({ ...encrypted, ...changes }) as unknown as EncryptedPayload;

    await expect(engine.decrypt(tamper({ version: 2 }))).rejects.toThrow(
      'Unsupported encrypted payload version: 2',
    );
    await expect(engine.decrypt(tamper({ algorithm: 'AES-CBC' }))).rejects.toThrow(
      'Unsupported encrypted payload algorithm',
    );
    await expect(engine.decrypt(tamper({ iv: 'AAAA' }))).rejects.toThrow(
      'Invalid AES-GCM IV length: 3',
    );
  });
});
