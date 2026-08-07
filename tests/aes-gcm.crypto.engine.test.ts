import { describe, expect, it } from 'vitest';
import { AesGcmCryptoEngine } from '../src/security/crypto/aesGcm';
import { StaticCryptoKeyProvider } from '../src/security/crypto/cryptoKeyProvider';

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
});
