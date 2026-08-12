import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from '../../storage/repository/migrationSchema';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { EncryptedBackupRotationService } from './encryptedBackupRotationService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';

describe('encrypted backup and storage key rotation', () => {
  it('migrates every persisted backup before retiring the previous key', async () => {
    const database = `encrypted-rotation-${crypto.randomUUID()}`;
    const backupDatabase = `encrypted-rotation-backups-${crypto.randomUUID()}`;
    const provider = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(database)),
    );
    await provider.initialize();

    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
    const repository = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const record: MigratedHealthRecord = {
      id: 'rotation-backup-record-001',
      schemaVersion: 1,
      createdAt: new Date(1760000000000).toISOString(),
      updatedAt: new Date(1760000005000).toISOString(),
      type: 'heart-rate',
      payload: { bpm: 72, unit: 'bpm' },
    };

    await repository.save(record);
    const backupService = new BackupRecoveryService(pipeline);
    const backup = await backupService.createBackup(record, '1');
    await backupStore.put('record-001', backup);

    const rotation = new EncryptedBackupRotationService(provider, backupStore, pipeline, repository);
    expect(await rotation.rotate()).toBe(2);

    const rotatedBackup = await backupStore.get<BackupEnvelope>('record-001');
    expect(rotatedBackup?.keyVersion).toBe('2');
    expect(rotatedBackup?.payload.keyVersion).toBe(2);
    await expect(provider.getKey(1)).rejects.toThrow('Crypto key version was not found');
    await expect(provider.getKey(2)).resolves.toBeDefined();
    await expect(backupService.restoreBackup<MigratedHealthRecord>(rotatedBackup!)).resolves.toEqual(record);
    await expect(repository.get(record.id)).resolves.toEqual(record);
  });

  it('does not retire the previous key when backup migration fails', async () => {
    const database = `encrypted-rotation-failure-${crypto.randomUUID()}`;
    const backupDatabase = `encrypted-rotation-failure-backups-${crypto.randomUUID()}`;
    const provider = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(database)),
    );
    await provider.initialize();

    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
    const repository = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const backupService = new BackupRecoveryService(pipeline);
    const invalid = await backupService.createBackup({ id: 'invalid-rotation-backup' }, '1');
    invalid.payload.ciphertext = 'corrupted';
    await backupStore.put('invalid', invalid);

    const rotation = new EncryptedBackupRotationService(provider, backupStore, pipeline, repository);
    await expect(rotation.rotate()).rejects.toThrow();
    await expect(provider.getKey(1)).resolves.toBeDefined();
    await expect(provider.getCurrentKeyVersion()).resolves.toBe(2);
  });
});
