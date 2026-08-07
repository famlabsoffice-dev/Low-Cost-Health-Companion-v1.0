import { describe, expect, it } from 'vitest';
import { DefaultCryptoPipeline, StaticCryptoKeyProvider, WebCryptoEngine } from '../../src/security/crypto';

async function createKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

describe('AES-GCM repository security flows', () => {
  it('encrypts and decrypts payloads with the real WebCrypto engine', async () => {
    const key = await createKey();
    const engine = new WebCryptoEngine(new StaticCryptoKeyProvider(key));
    const pipeline = new DefaultCryptoPipeline(engine);

    const record = {
      id: 'health-record-1',
      heartRate: 72,
      status: 'active',
    };

    const encrypted = await pipeline.encryptPayload(record);

    expect(encrypted.algorithm).toBe('AES-GCM');
    expect(encrypted.ciphertext).not.toContain(JSON.stringify(record));

    const restored = await pipeline.decryptPayload<typeof record>(encrypted);

    expect(restored).toEqual(record);
  });

  it('rejects payload decryption with a different key', async () => {
    const key = await createKey();
    const wrongKey = await createKey();

    const pipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new StaticCryptoKeyProvider(key)),
    );

    const encrypted = await pipeline.encryptPayload({ secure: true });

    const wrongPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new StaticCryptoKeyProvider(wrongKey)),
    );

    await expect(wrongPipeline.decryptPayload(encrypted)).rejects.toThrow();
  });
});
