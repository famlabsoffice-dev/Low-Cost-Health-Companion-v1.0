import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DefaultCryptoPipeline } from '../../security/crypto/cryptoPipeline';
import { PersistentStorageCryptoKeyProvider } from '../../security/crypto/persistentCryptoKeyProvider';
import { WebCryptoEngine } from '../../security/crypto/webCryptoEngine';
import { IndexedDbStorageRepository } from './storageRepository';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from './migrationSchema';

const DATABASE_NAME = 'low-cost-health-companion';

function createRepository(): IndexedDbStorageRepository<MigratedHealthRecord> {
  const provider = new PersistentStorageCryptoKeyProvider(undefined, 'contract-key');
  const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
  return new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
}

async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

afterEach(deleteDatabase);

describe('production encrypted storage contract', () => {
  it('encrypts before persistence and decrypts through the production repository', async () => {
    const repository = createRepository();
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
    const repository = createRepository();

    await expect(repository.save({
      id: 'cleartext-001',
      value: 128,
      unit: 'mmHg',
    })).rejects.toThrow('Invalid storage payload');
  });
});
