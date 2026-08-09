import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import type { CryptoKeyProvider } from '../crypto/cryptoTypes';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { PersistentCryptoKeyProvider, IndexedDbCryptoKeyStore } from '../keys/persistentCryptoKeyProvider';
import type { HealthRecord } from '../../domain/healthRecord';
import { migratedHealthRecordSchema } from '../../storage/repository/migrationSchema';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';

describe('backup restore end to end flow', () => {
  it('restores an encrypted health record after backup persistence and persistent-key provider restart', async () => {
    const backupDatabase = `restore-e2e-${crypto.randomUUID()}`;
    const keyDatabase = `restore-keys-e2e-${crypto.randomUUID()}`;
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const keyStore = new IndexedDbCryptoKeyStore(keyDatabase);
    const firstKeyProvider = new PersistentCryptoKeyProvider(keyStore);
    const keyId = 'device-root-key';
    const firstKey = await firstKeyProvider.getOrCreate(keyId);
    const keyVersion = await firstKeyProvider.getCurrentVersion(keyId);
    const keyVersionLabel = String(keyVersion);

    const provider: CryptoKeyProvider = {
      getKey: async (version) => firstKeyProvider.getVersion(keyId, version ?? keyVersion),
      getCurrentKeyVersion: async () => keyVersion,
    };
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const record: HealthRecord = {
      id: 'record-001',
      type: 'blood-pressure',
      value: { systolic: 128, diastolic: 82, unit: 'mmHg' },
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    };

    expect(await crypto.subtle.exportKey('jwk', firstKey)).toEqual(await firstKeyProvider.exportKey(keyId));

    const backup = await service.createBackup(record, keyVersionLabel);
    await backupStore.put('health-record-backup', backup);

    const persisted = await backupStore.get<BackupEnvelope>('health-record-backup');
    expect(persisted).toEqual(backup);
    expect(persisted?.payload.keyVersion).toBe(keyVersion);
    expect(persisted?.payload.ciphertext).not.toContain('record-001');

    const restartedKeyProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const recoveredKey = await restartedKeyProvider.getVersion(keyId, keyVersion);
    const recoveredJwk = await crypto.subtle.exportKey('jwk', recoveredKey);
    expect(recoveredJwk).toEqual(await firstKeyProvider.exportKey(keyId));
    expect(await restartedKeyProvider.getCurrentVersion(keyId)).toBe(keyVersion);

    const recoveredProvider: CryptoKeyProvider = {
      getKey: async (version) => restartedKeyProvider.getVersion(keyId, version ?? keyVersion),
      getCurrentKeyVersion: async () => restartedKeyProvider.getCurrentVersion(keyId),
    };
    const recoveredPipeline = new DefaultCryptoPipeline(new WebCryptoEngine(recoveredProvider));
    const recoveredService = new BackupRecoveryService(recoveredPipeline);
    const resolver = {
      resolve: async (version: string) => {
        if (version !== keyVersionLabel) throw new Error(`Crypto recovery key not found: ${version}`);
        return recoveredPipeline;
      },
    };

    const restored = await recoveredService.restoreWithRecovery<HealthRecord>(persisted!, resolver);

    expect(restored).toEqual(record);
    expect(typeof restored.id).toBe('string');
    expect(restored.id.length).toBeGreaterThan(0);
    expect(typeof restored.type).toBe('string');
    expect(restored.createdAt).toBeGreaterThan(0);
    expect(restored.updatedAt).toBeGreaterThanOrEqual(restored.createdAt);
    expect(restored.value).toEqual({ systolic: 128, diastolic: 82, unit: 'mmHg' });
  });

  it('executes the complete IndexedDB storage to encrypted backup to persistent key recovery to IndexedDB restore flow', async () => {
    const sourceDatabase = `source-storage-e2e-${crypto.randomUUID()}`;
    const backupDatabase = `source-backup-e2e-${crypto.randomUUID()}`;
    const keyDatabase = `source-keys-e2e-${crypto.randomUUID()}`;
    const keyId = 'device-root-key';
    const sourceRecord: HealthRecord = {
      id: 'indexeddb-source-001',
      type: 'blood-pressure',
      value: { systolic: 124, diastolic: 79, unit: 'mmHg' },
      createdAt: 1760000100000,
      updatedAt: 1760000105000,
    };

    const sourceKeyProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    await sourceKeyProvider.getOrCreate(keyId);
    const sourceKeyVersion = await sourceKeyProvider.getCurrentVersion(keyId);
    const sourcePipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine({
        getKey: async (version) => sourceKeyProvider.getVersion(keyId, version ?? sourceKeyVersion),
        getCurrentKeyVersion: async () => sourceKeyProvider.getCurrentVersion(keyId),
      }),
    );
    const sourceRepository = new IndexedDbStorageRepository(migratedHealthRecordSchema, sourcePipeline);
    const sourceBackupService = new BackupRecoveryService(sourcePipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);

    await sourceRepository.save({
      id: sourceRecord.id,
      schemaVersion: 1,
      createdAt: new Date(sourceRecord.createdAt).toISOString(),
      updatedAt: new Date(sourceRecord.updatedAt).toISOString(),
      type: sourceRecord.type,
      payload: { value: sourceRecord.value },
    });

    const sourceRecords = await sourceRepository.listAll();
    expect(sourceRecords).toHaveLength(1);
    expect(sourceRecords[0]?.id).toBe(sourceRecord.id);

    const backup = await sourceBackupService.createBackup(sourceRecords, String(sourceKeyVersion));
    expect(backup.payload.ciphertext).not.toContain(sourceRecord.id);
    await backupStore.put('complete-indexeddb-backup', backup);

    const persistedBackup = await backupStore.get<BackupEnvelope>('complete-indexeddb-backup');
    expect(persistedBackup).toEqual(backup);

    const restartedKeyProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const recoveredKeyVersion = await restartedKeyProvider.getCurrentVersion(keyId);
    expect(recoveredKeyVersion).toBe(sourceKeyVersion);
    await expect(restartedKeyProvider.getVersion(keyId, sourceKeyVersion)).resolves.toBeDefined();

    const recoveredPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine({
        getKey: async (version) => restartedKeyProvider.getVersion(keyId, version ?? recoveredKeyVersion),
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
    const restored = await restoredRepository.get(sourceRecord.id);

    expect(restored).toEqual(sourceRecords[0]);
    expect(restored?.payload).toEqual({ value: sourceRecord.value });
    expect(restored?.id).toBe(sourceRecord.id);
    expect(await restoredRepository.listAll()).toEqual(sourceRecords);

    const sourceDatabaseProbe = new IndexedDbStorageRepository(migratedHealthRecordSchema, recoveredPipeline);
    expect(await sourceDatabaseProbe.get(sourceRecord.id)).toEqual(sourceRecords[0]);
    void sourceDatabase;
  });

  it('executes persistent-key recovery, backup restore, and backup re-encryption across provider restarts', async () => {
    const backupDatabase = `recovery-reencrypt-e2e-${crypto.randomUUID()}`;
    const keyDatabase = `recovery-reencrypt-keys-e2e-${crypto.randomUUID()}`;
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const keyId = 'device-root-key';
    const record: HealthRecord = {
      id: 'record-reencrypt-001',
      type: 'heart-rate',
      value: { bpm: 72, unit: 'bpm' },
      createdAt: 1760000000000,
      updatedAt: 1760000005000,
    };

    const initialProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const initialKey = await initialProvider.getOrCreate(keyId);
    const initialVersion = await initialProvider.getCurrentVersion(keyId);
    const initialProviderAdapter: CryptoKeyProvider = {
      getKey: async (version) => initialProvider.getVersion(keyId, version ?? initialVersion),
      getCurrentKeyVersion: async () => initialProvider.getCurrentVersion(keyId),
    };
    const initialPipeline = new DefaultCryptoPipeline(new WebCryptoEngine(initialProviderAdapter));
    const initialService = new BackupRecoveryService(initialPipeline);
    const originalBackup = await initialService.createBackup(record, String(initialVersion));
    await backupStore.put('health-record-backup', originalBackup);

    const recoveryProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const recoveredVersion = await recoveryProvider.getCurrentVersion(keyId);
    expect(recoveredVersion).toBe(initialVersion);
    expect(await crypto.subtle.exportKey('jwk', await recoveryProvider.getVersion(keyId, initialVersion))).toEqual(
      await crypto.subtle.exportKey('jwk', initialKey),
    );

    const recoveryPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine({
        getKey: async (version) => recoveryProvider.getVersion(keyId, version ?? recoveredVersion),
        getCurrentKeyVersion: async () => recoveryProvider.getCurrentVersion(keyId),
      }),
    );
    const recoveryService = new BackupRecoveryService(recoveryPipeline);
    const persistedOriginal = await backupStore.get<BackupEnvelope>('health-record-backup');
    expect(persistedOriginal).toEqual(originalBackup);

    const restored = await recoveryService.restoreWithRecovery<HealthRecord>(persistedOriginal!, {
      resolve: async (version) => {
        expect(version).toBe(String(initialVersion));
        return recoveryPipeline;
      },
    });
    expect(restored).toEqual(record);

    const rotatedKey = await recoveryProvider.rotate(keyId);
    const rotatedVersion = await recoveryProvider.getCurrentVersion(keyId);
    expect(rotatedVersion).toBe(initialVersion + 1);
    expect(await crypto.subtle.exportKey('jwk', rotatedKey)).not.toEqual(
      await crypto.subtle.exportKey('jwk', initialKey),
    );

    const rotatedPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine({
        getKey: async (version) => recoveryProvider.getVersion(keyId, version ?? rotatedVersion),
        getCurrentKeyVersion: async () => recoveryProvider.getCurrentVersion(keyId),
      }),
    );
    const rotatedService = new BackupRecoveryService(rotatedPipeline);
    const reEncryptedBackup = await rotatedService.reEncryptBackup<HealthRecord>(
      persistedOriginal!,
      {
        resolve: async (version) => {
          expect(version).toBe(String(initialVersion));
          return recoveryPipeline;
        },
      },
      String(rotatedVersion),
    );

    expect(reEncryptedBackup.version).toBe(2);
    expect(reEncryptedBackup.keyVersion).toBe(String(rotatedVersion));
    expect(reEncryptedBackup.payload.keyVersion).toBe(rotatedVersion);
    expect(reEncryptedBackup.payload.ciphertext).not.toContain(record.id);
    expect(reEncryptedBackup.payload.ciphertext).not.toBe(persistedOriginal?.payload.ciphertext);
    await backupStore.put('health-record-backup-reencrypted', reEncryptedBackup);

    const finalKeyProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    expect(await finalKeyProvider.getCurrentVersion(keyId)).toBe(rotatedVersion);
    await expect(finalKeyProvider.getVersion(keyId, rotatedVersion)).resolves.toBeDefined();

    const finalPipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine({
        getKey: async (version) => finalKeyProvider.getVersion(keyId, version ?? rotatedVersion),
        getCurrentKeyVersion: async () => finalKeyProvider.getCurrentVersion(keyId),
      }),
    );
    const finalService = new BackupRecoveryService(finalPipeline);
    const persistedReEncrypted = await backupStore.get<BackupEnvelope>('health-record-backup-reencrypted');
    expect(persistedReEncrypted).toEqual(reEncryptedBackup);

    const finalRestored = await finalService.restoreWithRecovery<HealthRecord>(persistedReEncrypted!, {
      resolve: async (version) => {
        expect(version).toBe(String(rotatedVersion));
        return finalPipeline;
      },
    });

    expect(finalRestored).toEqual(record);
  });

  it('rejects a corrupted encrypted backup', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const provider: CryptoKeyProvider = {
      getKey: async () => key,
      getCurrentKeyVersion: async () => 1,
    };
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const backup = await service.createBackup({ id: 'corruption-test' }, '1');
    const corrupted: BackupEnvelope = {
      ...backup,
      payload: { ...backup.payload, ciphertext: `${backup.payload.ciphertext.slice(0, -2)}AA` },
    };

    await expect(service.restoreBackup(corrupted)).rejects.toThrow();
  });
});
