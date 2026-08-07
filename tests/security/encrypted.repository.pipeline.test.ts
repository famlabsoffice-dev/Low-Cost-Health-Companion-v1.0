import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { WebCryptoEngine } from '../../src/security/crypto/webCryptoEngine';
import { StaticCryptoKeyProvider } from '../../src/security/crypto/cryptoKeyProvider';
import { IndexedDbSecureStorage } from '../../src/security/storage/indexedDbSecureStorage';
import { EncryptedRepository } from '../../src/security/storage/encryptedRepository';

async function createRepository() {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );

  return new EncryptedRepository(
    new IndexedDbSecureStorage(),
    new WebCryptoEngine(new StaticCryptoKeyProvider(key)),
  );
}

describe('Encrypted repository pipeline', () => {
  it('Save -> Encrypt -> IndexedDB -> Load -> Decrypt -> Validate', async () => {
    const repository = await createRepository();

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

  it('rejects invalid encrypted records', async () => {
    const storage = new IndexedDbSecureStorage();
    const repository = new EncryptedRepository(storage);

    await expect(
      repository.load('invalid-record'),
    ).resolves.toBeNull();
  });

  it('deletes encrypted records', async () => {
    const repository = await createRepository();

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
