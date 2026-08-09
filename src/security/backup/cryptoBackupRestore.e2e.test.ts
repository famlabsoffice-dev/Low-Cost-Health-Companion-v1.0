import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import type { CryptoKeyProvider } from '../crypto/cryptoTypes';
import { AesGcmCryptoEngine } from '../crypto/aesGcmCryptoEngine';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import type { HealthRecord } from '../../domain/healthRecord';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';
import { IndexedDbCryptoKeyRecoveryAdapter } from './indexedDbCryptoKeyRecoveryAdapter';

describe('backup restore end to end flow', () => {
  it('restores a real encrypted health record after backup persistence and simulated restart', async () => {
    const backupDatabase = `restore-e2e-${crypto.randomUUID()}`;
    const keyDatabase = `restore-keys-e2e-${crypto.randomUUID()}`;
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const keyStore = new IndexedDbCryptoKeyRecoveryAdapter(keyDatabase);
    const keyVersion = 7;
    const keyVersionLabel = String(keyVersion);
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    await keyStore.saveCryptoKey(keyVersionLabel, key);

    const provider: CryptoKeyProvider = {
      getKey: async (version) => {
        if (version !== undefined && version !== keyVersion) throw new Error(`Unexpected key version: ${version}`);
        return key;
      },
      getCurrentKeyVersion: async () => keyVersion,
    };
    const pipeline = new DefaultCryptoPipeline(new AesGcmCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const record: HealthRecord = {
      id: 'record-001',
      type: 'blood-pressure',
      value: { systolic: 128, diastolic: 82, unit: 'mmHg' },
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    };

    const backup = await service.createBackup(record, keyVersionLabel);
    await backupStore.put('health-record-backup', backup);

    const persisted = await backupStore.get<BackupEnvelope>('health-record-backup');
    expect(persisted).toEqual(backup);
    expect(persisted?.payload.keyVersion).toBe(keyVersion);
    expect(persisted?.payload.ciphertext).not.toContain('record-001');

    const restartedKeyStore = new IndexedDbCryptoKeyRecoveryAdapter(keyDatabase);
    const restoredJwk = await restartedKeyStore.load(keyVersionLabel);
    expect(restoredJwk).toBeDefined();

    const recoveredKey = await restartedKeyStore.importCryptoKey(keyVersionLabel);
    const recoveredProvider: CryptoKeyProvider = {
      getKey: async (version) => {
        if (version !== keyVersion) throw new Error(`Unknown recovered key version: ${version}`);
        return recoveredKey;
      },
      getCurrentKeyVersion: async () => keyVersion,
    };
    const recoveredPipeline = new DefaultCryptoPipeline(new AesGcmCryptoEngine(recoveredProvider));
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

  it('rejects a corrupted encrypted backup', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const provider: CryptoKeyProvider = {
      getKey: async () => key,
      getCurrentKeyVersion: async () => 1,
    };
    const pipeline = new DefaultCryptoPipeline(new AesGcmCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const backup = await service.createBackup({ id: 'corruption-test' }, '1');
    const corrupted: BackupEnvelope = {
      ...backup,
      payload: { ...backup.payload, ciphertext: `${backup.payload.ciphertext.slice(0, -2)}AA` },
    };

    await expect(service.restoreBackup(corrupted)).rejects.toThrow();
  });

  it('rejects restore when the recovery key version is unknown', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const provider: CryptoKeyProvider = {
      getKey: async () => key,
      getCurrentKeyVersion: async () => 1,
    };
    const pipeline = new DefaultCryptoPipeline(new AesGcmCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const backup = await service.createBackup({ id: 'unknown-version-test' }, '1');

    await expect(
      service.restoreWithRecovery(backup, {
        resolve: async (version) => {
          throw new Error(`Crypto recovery key not found: ${version}`);
        },
      }),
    ).rejects.toThrow('Crypto recovery key not found: 1');
  });

  it('rejects restore with the wrong recovered key', async () => {
    const originalKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const wrongKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const provider: CryptoKeyProvider = {
      getKey: async () => originalKey,
      getCurrentKeyVersion: async () => 3,
    };
    const pipeline = new DefaultCryptoPipeline(new AesGcmCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const backup = await service.createBackup({ id: 'wrong-key-test' }, '3');
    const wrongPipeline = new DefaultCryptoPipeline(
      new AesGcmCryptoEngine({
        getKey: async () => wrongKey,
        getCurrentKeyVersion: async () => 3,
      }),
    );

    await expect(
      service.restoreWithRecovery(backup, { resolve: async () => wrongPipeline }),
    ).rejects.toThrow();
  });
});
