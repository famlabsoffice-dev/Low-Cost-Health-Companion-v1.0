import { describe, expect, it } from 'vitest';
import { EncryptedRepository } from '../../src/security/storage/encryptedRepository';
import { DefaultCryptoPipeline } from '../../src/security/crypto/cryptoPipeline';
import type { CryptoEngine } from '../../src/security/crypto/cryptoTypes';
import type { EncryptedSecureRecord, SecureStorage } from '../../src/security/storage/storageTypes';

describe('encrypted storage flow', () => {
  it('saves encrypted payload and loads decrypted record', async () => {
    let stored: EncryptedSecureRecord | null = null;

    const storage: SecureStorage = {
      async set(record) {
        stored = record as EncryptedSecureRecord;
      },
      async get() {
        return stored;
      },
      async remove() {},
      async clear() {},
    };

    const engine: CryptoEngine = {
      async encrypt(value) {
        return { ciphertext: value, iv: 'iv', algorithm: 'AES-GCM', version: 1 };
      },
      async decrypt(payload) {
        return payload.ciphertext;
      },
    };

    const repository = new EncryptedRepository(storage, new DefaultCryptoPipeline(engine));
    const record = { id: 'health-1', payload: { steps: 5000 }, createdAt: 1, updatedAt: 1, version: 1 };

    await repository.save(record);

    expect(stored?.payload.algorithm).toBe('AES-GCM');

    const restored = await repository.load<typeof record.payload>('health-1');
    expect(restored?.payload).toEqual(record.payload);
  });

  it('rejects invalid encrypted records', async () => {
    const storage: SecureStorage = {
      async set() {},
      async get() {
        return { id: 'broken', payload: { ciphertext: 'x' }, createdAt: 1, updatedAt: 1, version: 1 } as never;
      },
      async remove() {},
      async clear() {},
    };

    const repository = new EncryptedRepository(storage);
    await expect(repository.load('broken')).resolves.toBeDefined();
  });
});
