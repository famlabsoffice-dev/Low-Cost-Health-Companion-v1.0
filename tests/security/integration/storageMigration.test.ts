import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbRepository } from '../../../src/storage/indexedDbRepository';
import { CleartextToEncryptedStorageMigration } from '../../../src/storage/repository/storageMigration';
import { IndexedDbStorageRepository } from '../../../src/storage/repository/storageRepository';
import { migratedHealthRecordSchema, type MigratedHealthRecord } from '../../../src/storage/repository/migrationSchema';
import type { CryptoPipeline } from '../../../src/security/crypto/cryptoPipeline';
import type { EncryptedPayload } from '../../../src/security/crypto/cryptoTypes';

class TestCryptoPipeline implements CryptoPipeline {
  async encryptPayload<T>(payload: T): Promise<EncryptedPayload> {
    return {
      ciphertext: btoa(JSON.stringify(payload)),
      iv: 'test-iv',
      algorithm: 'AES-GCM',
      version: 1,
      keyVersion: 1,
    };
  }

  async decryptPayload<T>(payload: EncryptedPayload): Promise<T> {
    return JSON.parse(atob(payload.ciphertext)) as T;
  }
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

describe('Cleartext → encrypted storage migration', () => {
  beforeEach(async () => {
    await deleteDatabase('health-companion');
    await deleteDatabase('low-cost-health-companion');
  });

  it('encrypts legacy records, validates the encrypted round-trip, and removes cleartext records only after verification', async () => {
    const legacy = new IndexedDbRepository();
    const encrypted = new IndexedDbStorageRepository<MigratedHealthRecord>(
      migratedHealthRecordSchema,
      new TestCryptoPipeline(),
    );
    const record = {
      id: 'migration-001',
      createdAt: '2026-08-12T18:00:00.000Z',
      updatedAt: '2026-08-12T18:01:00.000Z',
      type: 'blood-pressure',
      payload: { systolic: 124, diastolic: 79, unit: 'mmHg' },
    };

    await legacy.save(record);
    expect(await legacy.listAll()).toHaveLength(1);

    const result = await new CleartextToEncryptedStorageMigration(legacy, encrypted).migrate();

    expect(result).toEqual({ migrated: 1 });
    expect(await legacy.listAll()).toEqual([]);
    expect(await encrypted.get(record.id)).toEqual({ ...record, schemaVersion: 1 });
  });

  it('is idempotent after a successful migration', async () => {
    const legacy = new IndexedDbRepository();
    const encrypted = new IndexedDbStorageRepository<MigratedHealthRecord>(
      migratedHealthRecordSchema,
      new TestCryptoPipeline(),
    );
    await legacy.save({
      id: 'migration-002',
      createdAt: '2026-08-12T18:00:00.000Z',
      updatedAt: '2026-08-12T18:00:00.000Z',
      type: 'heart-rate',
      payload: { bpm: 72, unit: 'bpm' },
    });

    const migration = new CleartextToEncryptedStorageMigration(legacy, encrypted);
    expect(await migration.migrate()).toEqual({ migrated: 1 });
    expect(await migration.migrate()).toEqual({ migrated: 0 });
    expect(await encrypted.listAll()).toHaveLength(1);
  });

  it('refuses conflicting encrypted data and preserves the legacy record', async () => {
    const legacy = new IndexedDbRepository();
    const encrypted = new IndexedDbStorageRepository<MigratedHealthRecord>(
      migratedHealthRecordSchema,
      new TestCryptoPipeline(),
    );
    const record = {
      id: 'migration-conflict',
      createdAt: '2026-08-12T18:00:00.000Z',
      updatedAt: '2026-08-12T18:00:00.000Z',
      type: 'temperature',
      payload: { value: 36.7, unit: 'C' },
    };

    await legacy.save(record);
    await encrypted.save({ ...record, schemaVersion: 1, payload: { value: 40, unit: 'C' } });

    await expect(new CleartextToEncryptedStorageMigration(legacy, encrypted).migrate())
      .rejects.toThrow('Encrypted migration conflict for record: migration-conflict');
    expect(await legacy.get(record.id)).toEqual(record);
  });
});
