import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { AesGcmCryptoEngine } from '../crypto/aesGcmCryptoEngine';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { PersistentCryptoKeyProvider, IndexedDbCryptoKeyStore } from '../keys/persistentCryptoKeyProvider';
import { migratedHealthRecordSchema } from '../../storage/repository/migrationSchema';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';

describe('production backup restore E2E', () => {
  it('executes IndexedDB storage -> encrypted backup -> persistent key recovery -> IndexedDB restore', async () => {
    const backupDatabase = `production-backup-e2e-${crypto.randomUUID()}`;
    const keyDatabase = `production-key-e2e-${crypto.randomUUID()}`;
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const keyId = 'device-root-key';
    const sourceRecord = {
      id: 'production-e2e-001',
      schemaVersion: 1,
      createdAt: '2025-10-09T08:00:00.000Z',
      updatedAt: '2025-10-09T08:05:00.000Z',
      type: 'blood-pressure',
      payload: { value: { systolic: 124, diastolic: 79, unit: 'mmHg' } },
    };

    const sourceKeyProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    await sourceKeyProvider.getOrCreate(keyId);
    const sourceKeyVersion = await sourceKeyProvider.getCurrentVersion(keyId);
    const sourcePipeline = new DefaultCryptoPipeline(
      new AesGcmCryptoEngine({
        getKey: async (version) => sourceKeyProvider.getVersion(keyId, version ?? sourceKeyVersion),
        getCurrentKeyVersion: async () => sourceKeyProvider.getCurrentVersion(keyId),
      }),
    );
    const sourceRepository = new IndexedDbStorageRepository(migratedHealthRecordSchema, sourcePipeline);
    const sourceBackupService = new BackupRecoveryService(sourcePipeline);

    await sourceRepository.save(sourceRecord);
    const sourceRecords = await sourceRepository.listAll();
    expect(sourceRecords).toEqual([sourceRecord]);

    const backup = await sourceBackupService.createBackup(sourceRecords, String(sourceKeyVersion));
    expect(backup.version).toBe(2);
    expect(backup.keyVersion).toBe(String(sourceKeyVersion));
    expect(backup.payload.ciphertext).not.toContain(sourceRecord.id);
    expect(backup.payload.ciphertext).not.toContain('124');
    await backupStore.put('production-backup', backup);

    const persistedBackup = await backupStore.get<BackupEnvelope>('production-backup');
    expect(persistedBackup).toEqual(backup);

    await sourceRepository.remove(sourceRecord.id);
    expect(await sourceRepository.get(sourceRecord.id)).toBeNull();

    const restartedKeyProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    expect(await restartedKeyProvider.getCurrentVersion(keyId)).toBe(sourceKeyVersion);
    await expect(restartedKeyProvider.getVersion(keyId, sourceKeyVersion)).resolves.toBeDefined();

    const recoveredPipeline = new DefaultCryptoPipeline(
      new AesGcmCryptoEngine({
        getKey: async (version) => restartedKeyProvider.getVersion(keyId, version ?? sourceKeyVersion),
        getCurrentKeyVersion: async () => restartedKeyProvider.getCurrentVersion(keyId),
      }),
    );
    const recoveredService = new BackupRecoveryService(recoveredPipeline);

    const restoredRecords = await recoveredService.restoreWithRecovery<typeof sourceRecords>(persistedBackup!, {
      resolve: async (version) => {
        expect(version).toBe(String(sourceKeyVersion));
        return recoveredPipeline;
      },
    });
    expect(restoredRecords).toEqual(sourceRecords);

    const restoredRepository = new IndexedDbStorageRepository(migratedHealthRecordSchema, recoveredPipeline);
    await restoredRepository.replaceAll(restoredRecords);

    expect(await restoredRepository.get(sourceRecord.id)).toEqual(sourceRecord);
    expect(await restoredRepository.listAll()).toEqual([sourceRecord]);
  });
});
