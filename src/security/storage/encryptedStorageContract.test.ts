import { afterEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { AesGcmCryptoEngine } from '../crypto/aesGcmCryptoEngine';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import { EncryptedRepository } from './encryptedRepository';
import { IndexedDbSecureStorage } from './indexedDbSecureStorage';
import { MemorySecureStorage } from './secureStorage';
import type { EncryptedSecureRecord } from './storageTypes';

const DATABASE_NAME = 'health-companion-secure';

const record = {
  id: 'contract-001',
  payload: { value: 128, unit: 'mmHg' },
  createdAt: 1754740800000,
  updatedAt: 1754741100000,
  version: 1,
};

async function createPipeline(): Promise<CryptoPipeline> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return new DefaultCryptoPipeline(new AesGcmCryptoEngine({
    getKey: async () => key,
    getCurrentKeyVersion: async () => 1,
  }));
}

const encryptedRecord = (): EncryptedSecureRecord => ({
  id: 'encrypted-001',
  payload: {
    ciphertext: 'Y2lwaGVydGV4dA==',
    iv: 'AAAAAAAAAAAAAAAA',
    algorithm: 'AES-GCM',
    version: 1,
    keyVersion: 1,
  },
  createdAt: 1754740800000,
  updatedAt: 1754741100000,
  version: 1,
});

async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

afterEach(async () => {
  await deleteDatabase();
});

describe('encrypted storage contract', () => {
  it('requires the repository to encrypt before persistence and decrypt on load', async () => {
    const pipeline = await createPipeline();
    const storage = new MemorySecureStorage();
    const repository = new EncryptedRepository(storage, pipeline);

    await repository.save(record);

    const persisted = await storage.get(record.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.payload.algorithm).toBe('AES-GCM');
    expect(persisted?.payload.ciphertext).not.toContain('128');
    expect(persisted?.payload.ciphertext).not.toContain('mmHg');
    await expect(repository.load(record.id)).resolves.toEqual(record);
  });

  it('rejects direct cleartext persistence through the in-memory secure storage contract', async () => {
    const storage = new MemorySecureStorage();

    await expect(storage.set(record as never)).rejects.toThrow('Invalid encrypted secure record');
  });

  it('rejects direct cleartext persistence through IndexedDB secure storage', async () => {
    const storage = new IndexedDbSecureStorage();

    await expect(storage.set(record as never)).rejects.toThrow('Invalid encrypted secure record');
  });

  it('accepts and returns only a valid encrypted record from IndexedDB', async () => {
    const storage = new IndexedDbSecureStorage();
    const encrypted = encryptedRecord();

    await storage.set(encrypted);
    await expect(storage.get(encrypted.id)).resolves.toEqual(encrypted);
  });
});
