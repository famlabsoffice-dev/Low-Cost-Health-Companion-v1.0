import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { DefaultCryptoPipeline } from '../src/security/crypto/cryptoPipeline';
import type { CryptoEngine } from '../src/security/crypto/cryptoTypes';
import { IndexedDbSecureStorage } from '../src/security/storage/indexedDbSecureStorage';
import { EncryptedRepository } from '../src/security/storage/encryptedRepository';

const engine: CryptoEngine = {
  async encrypt(value) {
    return {
      ciphertext: value,
      iv: 'iv',
      algorithm: 'AES-GCM',
      version: 1,
      keyVersion: 0,
    };
  },
  async decrypt(payload) {
    return payload.ciphertext;
  },
};

describe('IndexedDbSecureStorage', () => {
  it('persists and loads secure records', async () => {
    const storage = new IndexedDbSecureStorage();
    const repository = new EncryptedRepository(storage, new DefaultCryptoPipeline(engine));

    await repository.save({
      id: 'record-1',
      payload: { value: 'health-data' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    const result = await repository.load<{ value: string }>('record-1');

    expect(result?.payload.value).toBe('health-data');
  });
});
