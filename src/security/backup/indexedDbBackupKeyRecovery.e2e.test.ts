import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';
import { IndexedDbStorageRepository } from '../../storage/repository/storageRepository';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';

const recordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  measurement: z.object({ systolic: z.number(), diastolic: z.number(), pulse: z.number() }),
});

type HealthRecord = z.infer<typeof recordSchema>;

describe('IndexedDB to encrypted backup to persistent key recovery to restore E2E', () => {
  it('restores encrypted IndexedDB data after a provider restart with exact data integrity', async () => {
    const suffix = crypto.randomUUID();
    const keyDatabase = `e2e-key-${suffix}`;
    const backupDatabase = `e2e-backup-${suffix}`;
    const keyId = 'device-root-key';
    const provider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    await provider.getOrCreate(keyId);
    const keyVersion = await provider.getCurrentVersion(keyId);
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => provider.getVersion(keyId, requestedVersion ?? keyVersion),
      getCurrentKeyVersion: async () => provider.getCurrentVersion(keyId),
    }));
    const repository = new IndexedDbStorageRepository<HealthRecord>(recordSchema, pipeline);
    const sourceRecords: HealthRecord[] = [
      {
        id: 'e2e-record-1',
        schemaVersion: 1,
        createdAt: '2026-08-09T19:00:00.000Z',
        updatedAt: '2026-08-09T19:01:00.000Z',
        measurement: { systolic: 128, diastolic: 79, pulse: 67 },
      },
      {
        id: 'e2e-record-2',
        schemaVersion: 1,
        createdAt: '2026-08-09T19:02:00.000Z',
        updatedAt: '2026-08-09T19:03:00.000Z',
        measurement: { systolic: 134, diastolic: 82, pulse: 71 },
      },
    ];

    await repository.replaceAll(sourceRecords);
    const encryptedIndexedDbRecords = await repository.listAll();
    expect(encryptedIndexedDbRecords).toEqual(sourceRecords);

    const backupService = new BackupRecoveryService(pipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const backup = await backupService.createBackup(encryptedIndexedDbRecords, String(keyVersion));
    await backupStore.put('health-companion-e2e', backup);

    const restartedProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const recoveredVersion = await restartedProvider.getCurrentVersion(keyId);
    expect(recoveredVersion).toBe(keyVersion);
    const restartedPipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => restartedProvider.getVersion(keyId, requestedVersion ?? recoveredVersion),
      getCurrentKeyVersion: async () => restartedProvider.getCurrentVersion(keyId),
    }));
    const restartedService = new BackupRecoveryService(restartedPipeline);
    const persistedBackup = await backupStore.get<BackupEnvelope>('health-companion-e2e');
    expect(persistedBackup).toBeDefined();
    expect(persistedBackup?.version).toBe(2);
    expect(persistedBackup?.keyVersion).toBe(String(keyVersion));
    expect(persistedBackup?.payload.algorithm).toBe('AES-GCM');

    const restoredRecords = await restartedService.restoreWithRecovery<HealthRecord[]>(persistedBackup!, {
      resolve: async (requestedVersion) => {
        expect(requestedVersion).toBe(String(keyVersion));
        return restartedPipeline;
      },
    });
    expect(restoredRecords).toEqual(sourceRecords);

    await repository.replaceAll([]);
    expect(await repository.listAll()).toEqual([]);
    await repository.replaceAll(restoredRecords);
    expect(await repository.listAll()).toEqual(sourceRecords);
  });
});
