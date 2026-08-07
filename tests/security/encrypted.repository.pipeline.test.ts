import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { DefaultCryptoPipeline } from '../../src/security/crypto/cryptoPipeline';
import { StaticCryptoKeyProvider } from '../../src/security/crypto/cryptoKeyProvider';
import { WebCryptoEngine } from '../../src/security/crypto/webCryptoEngine';
import { IndexedDbSecureStorage } from '../../src/security/storage/indexedDbSecureStorage';
import { EncryptedRepository } from '../../src/security/storage/encryptedRepository';
import { validateEncryptedSecureRecord } from '../../src/security/storage/storageSchemas';

async function createRepository() {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );

  const pipeline = new DefaultCryptoPipeline(
    new WebCryptoEngine(new StaticCryptoKeyProvider(key)),
  );
  const storage = new IndexedDbSecureStorage();

  return {
    repository: new EncryptedRepository(storage, pipeline),
    storage,
    pipeline,
  };
}

describe('Encrypted repository pipeline', () => {
  it('Save -> Encrypt -> IndexedDB -> Load -> Decrypt -> Validate', async () => {
    const { repository } = await createRepository();

    await repository.save({
      id: 'pipeline-1',
      payload: { value: 'encrypted-health-data' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    const result = await repository.load<{ value: string }>('pipeline-1');

    expect(result?.payload.value).toBe('encrypted-health-data');
  });

  it('rejects missing encrypted records', async () => {
    const storage = new IndexedDbSecureStorage();
    const repository = new EncryptedRepository(storage);

    await expect(repository.load('invalid-record')).resolves.toBeNull();
  });

  it('rejects manipulated encrypted payloads', async () => {
    const { repository, storage, pipeline } = await createRepository();

    await repository.save({
      id: 'tampered-1',
      payload: { value: 'protected-data' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    const record = await storage.get('tampered-1');
    expect(record).not.toBeNull();

    if (!record || !validateEncryptedSecureRecord(record)) {
      throw new Error('Encrypted record was not stored');
    }

    await storage.set({
      ...record,
      payload: {
        ...record.payload,
        ciphertext: `${record.payload.ciphertext}tampered`,
      },
    });

    const isolatedRepository = new EncryptedRepository(storage, pipeline);

    await expect(isolatedRepository.load('tampered-1')).rejects.toThrow();
  });

  it('deletes encrypted records', async () => {
    const { repository } = await createRepository();

    await repository.save({
      id: 'delete-1',
      payload: { value: 'remove-me' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    await repository.delete('delete-1');

    expect(await repository.load('delete-1')).toBeNull();
  });
});
