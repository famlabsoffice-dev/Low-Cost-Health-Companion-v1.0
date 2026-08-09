import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from './persistentCryptoKeyProvider';
import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from '../../storage/repository/migrationSchema';
import { StorageKeyRotationService } from './storageKeyRotationService';

describe('production storage key rotation', () => {
  it('rotates, re-encrypts all records atomically, persists the new version, and retires the old key', async () => {
    const databaseName = `storage-key-rotation-${crypto.randomUUID()}`;
    const keyProvider = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
    );
    await keyProvider.initialize();

    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(keyProvider));
    const repository = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const record: MigratedHealthRecord = {
      id: 'rotation-record-001',
      schemaVersion: 1,
      createdAt: new Date(1760000000000).toISOString(),
      updatedAt: new Date(1760000005000).toISOString(),
      type: 'heart-rate',
      payload: { bpm: 72, unit: 'bpm' },
    };

    await repository.save(record);
    const before = await repository.get(record.id);
    expect(before).toEqual(record);

    const rotation = new StorageKeyRotationService(keyProvider, repository);
    expect(await rotation.rotate()).toBe(2);
    expect(await keyProvider.getCurrentKeyVersion()).toBe(2);
    expect(await repository.get(record.id)).toEqual(record);
    await expect(keyProvider.getKey(1)).rejects.toThrow('Crypto key version was not found');
    await expect(keyProvider.getKey(2)).resolves.toBeDefined();
  });
});
