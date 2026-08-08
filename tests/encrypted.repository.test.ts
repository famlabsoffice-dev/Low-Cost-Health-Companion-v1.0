import { describe, expect, it } from 'vitest';
import { EncryptedRepository } from '../src/security/storage/encryptedRepository';
import type { CryptoPipeline } from '../src/security/crypto/cryptoPipeline';
import type { SecureStorage } from '../src/security/storage/storageTypes';

function createStorage(): SecureStorage {
  const records = new Map<string, unknown>();

  return {
    async set(record) {
      records.set(record.id, record);
    },
    async get(id) {
      return (records.get(id) as never) ?? null;
    },
    async remove(id) {
      records.delete(id);
    },
    async clear() {
      records.clear();
    },
  };
}

function createPipeline(): CryptoPipeline {
  return {
    async encryptPayload(payload) {
      return {
        ciphertext: JSON.stringify(payload),
        iv: 'test-iv',
        algorithm: 'AES-GCM',
        version: 1,
        keyVersion: 1,
      };
    },
    async decryptPayload(payload) {
      return JSON.parse(payload.ciphertext);
    },
  };
}

describe('EncryptedRepository', () => {
  it('stores encrypted payloads and restores decrypted records', async () => {
    const repository = new EncryptedRepository(createStorage(), createPipeline());
    const record = {
      id: 'health-1',
      payload: { heartRate: 72 },
      createdAt: 1,
      updatedAt: 1,
      version: 1,
    };

    await repository.save(record);
    const loaded = await repository.load<typeof record.payload>('health-1');

    expect(loaded?.payload).toEqual(record.payload);
  });

  it('returns null for missing records', async () => {
    const repository = new EncryptedRepository(createStorage(), createPipeline());

    await expect(repository.load('missing')).resolves.toBeNull();
  });

  it('removes records', async () => {
    const repository = new EncryptedRepository(createStorage(), createPipeline());

    await repository.save({
      id: 'delete-me',
      payload: { value: true },
      createdAt: 1,
      updatedAt: 1,
      version: 1,
    });

    await repository.delete('delete-me');

    await expect(repository.load('delete-me')).resolves.toBeNull();
  });
});
