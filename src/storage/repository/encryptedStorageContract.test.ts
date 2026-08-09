import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DefaultCryptoPipeline } from '../../security/crypto/cryptoPipeline';
import { PersistentStorageCryptoKeyProvider } from '../../security/crypto/persistentCryptoKeyProvider';
import { WebCryptoEngine } from '../../security/crypto/webCryptoEngine';
import { IndexedDbStorageRepository } from './storageRepository';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from './migrationSchema';

const databases: string[] = [];

function createRepository(): Promise<IndexedDbStorageRepository<MigratedHealthRecord>> {
  const databaseName = `production-storage-contract-${crypto.randomUUID()}`;
  databases.push(databaseName);
  const provider = new PersistentStorageCryptoKeyProvider(
    undefined,
    'contract-key',
  );
  const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
  return Promise.resolve(new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline, databaseName));
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(
      (databaseName) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(databaseName);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );
});

describe('production encrypted storage contract', () => {
  it('encrypts before persistence and decrypts through the production repository', async () => {
    const repository = await createRepository();
    const record: MigratedHealthRecord = {
      id: 'contract-001',
      schemaVersion: 1,
      createdAt: new Date(1754740800000).toISOString(),
      updatedAt: new Date(1754741100000).toISOString(),
      type: 'blood-pressure',
      payload: { value: 128, unit: 'mmHg' },
    };

    await repository.save(record);
    await expect(repository.get(record.id)).resolves.toEqual(record);
  });

  it('rejects cleartext values that do not satisfy the production schema', async () => {
    const repository = await createRepository();

    await expect(repository.save({
      id: 'cleartext-001',
      value: 128,
      unit: 'mmHg',
    })).rejects.toThrow('Invalid storage payload');
  });
});
