import { describe, expect, it } from 'vitest';
import { DefaultCryptoPipeline } from '../../src/security/crypto/cryptoPipeline';
import type { CryptoEngine } from '../../src/security/crypto/cryptoTypes';

describe('crypto pipeline integration', () => {
  it('encrypts and restores payload through AES-GCM pipeline contract', async () => {
    const engine: CryptoEngine = {
      async encrypt(value) {
        return { ciphertext: value, iv: 'test-iv', algorithm: 'AES-GCM', version: 1 };
      },
      async decrypt(payload) {
        return payload.ciphertext;
      },
    };

    const pipeline = new DefaultCryptoPipeline(engine);
    const original = { heartRate: 72, note: 'healthy' };

    const encrypted = await pipeline.encryptPayload(original);
    const restored = await pipeline.decryptPayload<typeof original>(encrypted);

    expect(encrypted.algorithm).toBe('AES-GCM');
    expect(restored).toEqual(original);
  });
});
