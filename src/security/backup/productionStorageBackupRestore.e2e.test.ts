import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { HealthRecordRepository } from '../../domain/healthRecordRepository';
import type { HealthRecord } from '../../domain/healthRecord';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { versionedStorageSchema } from '../../storage/schemas/storageSchemas';
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
    const storageRepository = new IndexedDbStorageRepository(versionedStorageSchema, pipeline);
    const healthRepository = new HealthRecordRepository({
      save: async (record) => storageRepository.save(record.payload),
      load: async (id) => {
        const record = await storageRepository.get(id);
        return record ? { ...record, payload: record } : null;
      },
      delete: (id) => storageRepository.remove(id),
    } as never);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const backupService = new BackupRecoveryService(pipeline);
    const keyId = 'device-root-key';
    const record: HealthRecord = {
      id: `production-e2e-${crypto.randomUUID()}`,
      type: 'blood-pressure',
      value: { systolic: 124, diastolic: 79, unit: 'mmHg' },
      createdAt: 1760000000000,
      updatedAt: 1760000005000,
    };

    const initialKey = await persistentProvider.getOrCreate(keyId);
    const initialVersion = await persistentProvider.getCurrentVersion(keyId);
    await healthRepository.save(record);
    expect(await healthRepository.get(record.id)).toEqual(record);

    const backup = await backupService.createBackup(record, String(initialVersion));
    await backupStore.put('health-record-backup', backup);
    await healthRepository.delete(record.id);
    expect(await healthRepository.get(record.id)).toBeNull();

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

    const restored = await restartedService.restoreWithRecovery<HealthRecord>(persistedBackup!, {
      resolve: async (version) => {
        expect(version).toBe(String(initialVersion));
        return restartedPipeline;
      },
    });
    expect(restored).toEqual(record);
    await healthRepository.save(restored);
    expect(await healthRepository.get(record.id)).toEqual(record);

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
    const reEncrypted = await rotatedService.reEncryptBackup<HealthRecord>(
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

    await healthRepository.delete(record.id);
    const finalRestored = await finalService.restoreWithRecovery<HealthRecord>(persistedReEncrypted!, {
      resolve: async (version) => {
        expect(version).toBe(String(rotatedVersion));
        return finalPipeline;
      },
    });
    await healthRepository.save(finalRestored);
    expect(await healthRepository.get(record.id)).toEqual(record);
  });
});
