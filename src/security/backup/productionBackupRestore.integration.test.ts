import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { BackupRecoveryService } from './backupRecoveryService';
import { createCryptoPipeline, createHealthRecordStorageRepository } from '../../storage/repository/storageServiceFactory';
import type { MigratedHealthRecord } from '../../storage/repository/migrationSchema';

const databaseName = 'low-cost-health-companion';
const storeName = 'secure-storage';

async function readPersistedRecord(id: string): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onsuccess = () => {
      const database = request.result;
      try {
        const transaction = database.transaction(storeName, 'readonly');
        const read = transaction.objectStore(storeName).get(id);
        read.onsuccess = () => {
          database.close();
          resolve(read.result);
        };
        read.onerror = () => {
          database.close();
          reject(read.error);
        };
      } catch (error) {
        database.close();
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

afterEach(async () => {
  await deleteDatabase();
});

describe('production backup/restore encryption flow', () => {
  it('restores a backup into the production encrypted repository without cleartext persistence', async () => {
    const pipeline = await createCryptoPipeline();
    const repository = await createHealthRecordStorageRepository();
    const backupService = new BackupRecoveryService(pipeline);
    const record: MigratedHealthRecord = {
      id: 'backup-restore-production-001',
      schemaVersion: 1,
      createdAt: new Date(1754740800000).toISOString(),
      updatedAt: new Date(1754741100000).toISOString(),
      type: 'blood-pressure',
      payload: { value: 128, unit: 'mmHg' },
    };

    const backup = await backupService.createBackup(record, String(await pipeline.getCurrentKeyVersion()));
    await repository.replaceAll([]);

    const restored = await backupService.restoreIntoStorage(
      backup,
      { resolve: async () => pipeline },
      repository,
    );

    expect(restored).toEqual(record);
    await expect(repository.get(record.id)).resolves.toEqual(record);

    const persisted = await readPersistedRecord(record.id) as { id?: string; payload?: { algorithm?: string; ciphertext?: string } } | undefined;
    expect(persisted?.id).toBe(record.id);
    expect(persisted?.payload?.algorithm).toBe('AES-GCM');
    expect(persisted?.payload?.ciphertext).toBeTypeOf('string');
    expect(persisted?.payload?.ciphertext).not.toContain('128');
    expect(persisted?.payload?.ciphertext).not.toContain('mmHg');
  });
});
