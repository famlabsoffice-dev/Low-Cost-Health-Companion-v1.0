import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BackupRecoveryService, type BackupEnvelope } from '../../../src/security/backup/backupRecoveryService';
import { IndexedDbBackupAdapter } from '../../../src/security/backup/indexedDbBackupAdapter';
import { PersistentCryptoKeyProvider, IndexedDbCryptoKeyStore } from '../../../src/security/keys/persistentCryptoKeyProvider';
import { DeviceRestoreService } from '../../../src/security/recovery/deviceRestoreService';
import { PersistentStorageCryptoKeyProvider } from '../../../src/security/crypto/persistentCryptoKeyProvider';
import { DefaultCryptoPipeline } from '../../../src/security/crypto/cryptoPipeline';
import { WebCryptoEngine } from '../../../src/security/crypto/webCryptoEngine';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from '../../../src/storage/repository/migrationSchema';
import { IndexedDbStorageRepository } from '../../../src/storage/repository/storageRepository';

describe('backup → key recovery → restore → decrypt → validation E2E', () => {
  it('recovers encrypted health data on a fresh key store and validates the restored record', async () => {
    const sourceKeyDatabase = `e2e-source-keys-${crypto.randomUUID()}`;
    const targetKeyDatabase = `e2e-target-keys-${crypto.randomUUID()}`;
    const backupDatabase = `e2e-backups-${crypto.randomUUID()}`;
    const keyId = 'device-root-key';
    const passphrase = 'correct horse battery staple';
    const record: MigratedHealthRecord = {
      id: `backup-recovery-e2e-${crypto.randomUUID()}`,
      schemaVersion: 1,
      createdAt: new Date(1760000000000).toISOString(),
      updatedAt: new Date(1760000005000).toISOString(),
      type: 'blood-pressure',
      payload: { systolic: 124, diastolic: 79, unit: 'mmHg' },
    };

    const sourceProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(sourceKeyDatabase));
    await sourceProvider.getOrCreate(keyId);
    const sourceVersion = await sourceProvider.getCurrentVersion(keyId);
    const sourcePipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(sourceProvider)),
    );
    const storage = new IndexedDbStorageRepository(migratedHealthRecordSchema, sourcePipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const backupService = new BackupRecoveryService(sourcePipeline);

    await storage.save(record);
    expect(await storage.get(record.id)).toEqual(record);

    const deviceRestore = new DeviceRestoreService(sourceProvider);
    const recoveryBundle = await deviceRestore.createBundle(keyId, passphrase);
    const backup = await backupService.createBackup(record, String(sourceVersion));
    await backupStore.put('e2e-backup', backup);

    await storage.remove(record.id);
    expect(await storage.get(record.id)).toBeNull();

    const targetProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(targetKeyDatabase));
    const targetRestore = new DeviceRestoreService(targetProvider);
    const restoredKey = await targetRestore.restoreBundle(recoveryBundle, passphrase);
    const targetVersion = await targetProvider.getCurrentVersion(keyId);
    expect(targetVersion).toBe(sourceVersion);
    expect(await crypto.subtle.exportKey('jwk', restoredKey)).toEqual(
      await crypto.subtle.exportKey('jwk', await sourceProvider.getVersion(keyId, sourceVersion)),
    );

    const targetPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(targetProvider)),
    );
    const targetBackupService = new BackupRecoveryService(targetPipeline);
    const persistedBackup = await backupStore.get<BackupEnvelope>('e2e-backup');
    expect(persistedBackup).toEqual(backup);

    const restored = await targetBackupService.restoreIntoStorage<MigratedHealthRecord>(
      persistedBackup!,
      { resolve: async (version) => {
        expect(version).toBe(String(sourceVersion));
        return targetPipeline;
      } },
      storage,
    );

    expect(restored).toEqual(record);
    expect(await storage.get(record.id)).toEqual(record);
    expect(await storage.listAll()).toEqual([record]);
  });
});
