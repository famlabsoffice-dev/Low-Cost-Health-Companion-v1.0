import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from '../../storage/repository/migrationSchema';
import { PersistentCryptoKeyProvider, IndexedDbCryptoKeyStore } from '../keys/persistentCryptoKeyProvider';
import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';

describe('production encrypted storage backup restore end to end', () => {
  it('restores production encrypted storage through persistent recovery and backup re-encryption', async () => {
    const keyDatabase = `production-storage-e2e-keys-${crypto.randomUUID()}`;
    const backupDatabase = `production-storage-e2e-backups-${crypto.randomUUID()}`;
    const keyStore = new IndexedDbCryptoKeyStore(keyDatabase);
    const persistentProvider = new PersistentCryptoKeyProvider(keyStore);
    const storageKeyProvider = new PersistentStorageCryptoKeyProvider(persistentProvider);
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(storageKeyProvider));
    const storageRepository = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const backupService = new BackupRecoveryService(pipeline);
    const keyId = 'device-root-key';
    const record: MigratedHealthRecord = {
      id: `production-e2e-${crypto.randomUUID()}`,
      schemaVersion: 1,
      createdAt: new Date(1760000000000).toISOString(),
      updatedAt: new Date(1760000005000).toISOString(),
      type: 'blood-pressure',
      payload: { systolic: 124, diastolic: 79, unit: 'mmHg' },
    };

    const initialKey = await persistentProvider.getOrCreate(keyId);
    const initialVersion = await persistentProvider.getCurrentVersion(keyId);
    await storageRepository.save(record);
    expect(await storageRepository.get(record.id)).toEqual(record);

    const backup = await backupService.createBackup(record, String(initialVersion));
    await backupStore.put('health-record-backup', backup);
    await storageRepository.remove(record.id);
    expect(await storageRepository.get(record.id)).toBeNull();

    const restartedProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const restartedPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(restartedProvider)),
    );
    const restartedService = new BackupRecoveryService(restartedPipeline);
    const persistedBackup = await backupStore.get<BackupEnvelope>('health-record-backup');
    expect(persistedBackup).toEqual(backup);
    expect(await crypto.subtle.exportKey('jwk', await restartedProvider.getVersion(keyId, initialVersion))).toEqual(
      await crypto.subtle.exportKey('jwk', initialKey),
    );

    const restored = await restartedService.restoreWithRecovery<MigratedHealthRecord>(persistedBackup!, {
      resolve: async (version) => {
        expect(version).toBe(String(initialVersion));
        return restartedPipeline;
      },
    });
    expect(restored).toEqual(record);
    await storageRepository.save(restored);
    expect(await storageRepository.get(record.id)).toEqual(record);

    const rotatedKey = await restartedProvider.rotate(keyId);
    const rotatedVersion = await restartedProvider.getCurrentVersion(keyId);
    expect(rotatedVersion).toBe(initialVersion + 1);
    expect(await crypto.subtle.exportKey('jwk', rotatedKey)).not.toEqual(
      await crypto.subtle.exportKey('jwk', initialKey),
    );

    const rotatedPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(restartedProvider)),
    );
    const rotatedService = new BackupRecoveryService(rotatedPipeline);
    const reEncrypted = await rotatedService.reEncryptBackup<MigratedHealthRecord>(
      persistedBackup!,
      { resolve: async () => restartedPipeline },
      String(rotatedVersion),
    );
    await backupStore.put('health-record-backup-reencrypted', reEncrypted);

    const finalProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const finalPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(finalProvider)),
    );
    const finalService = new BackupRecoveryService(finalPipeline);
    const persistedReEncrypted = await backupStore.get<BackupEnvelope>('health-record-backup-reencrypted');
    expect(persistedReEncrypted?.keyVersion).toBe(String(rotatedVersion));

    await storageRepository.remove(record.id);
    const finalRestored = await finalService.restoreWithRecovery<MigratedHealthRecord>(persistedReEncrypted!, {
      resolve: async (version) => {
        expect(version).toBe(String(rotatedVersion));
        return finalPipeline;
      },
    });
    await storageRepository.save(finalRestored);
    expect(await storageRepository.get(record.id)).toEqual(record);
  });
});
