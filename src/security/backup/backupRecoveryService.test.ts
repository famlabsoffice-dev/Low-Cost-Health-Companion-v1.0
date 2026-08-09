import { describe, expect, it } from 'vitest';
import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import { AesGcmCryptoEngine } from '../crypto/aesGcmCryptoEngine';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import type { CryptoKeyProvider } from '../crypto/cryptoTypes';
import { BackupRecoveryService } from './backupRecoveryService';

function createPipeline(key: CryptoKey, version: number): CryptoPipeline {
  const provider: CryptoKeyProvider = {
    getKey: async () => key,
    getCurrentKeyVersion: async () => version,
  };
  return new DefaultCryptoPipeline(new AesGcmCryptoEngine(provider));
}

describe('BackupRecoveryService', () => {
  it('migrates legacy envelopes before restore', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const pipeline = createPipeline(key, 1);
    const service = new BackupRecoveryService(pipeline);
    const legacy = {
      keyVersion: '1',
      payload: await pipeline.encryptPayload({ id: 'health-record' }),
    };

    expect(await service.restoreBackup(legacy)).toEqual({ id: 'health-record' });
    expect(service.migrateEnvelope(legacy).version).toBe(2);
  });

  it('re-encrypts an existing backup through the production recovery pipeline', async () => {
    const oldKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const newKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const oldPipeline = createPipeline(oldKey, 1);
    const newPipeline = createPipeline(newKey, 2);
    const service = new BackupRecoveryService(newPipeline);
    const backup = await new BackupRecoveryService(oldPipeline).createBackup({ id: 'health-record' }, '1');

    const rotated = await service.reEncryptBackup(
      backup,
      { resolve: async (version) => {
        expect(version).toBe('1');
        return oldPipeline;
      } },
      '2',
    );

    expect(rotated.version).toBe(2);
    expect(rotated.keyVersion).toBe('2');
    expect(await service.restoreBackup(rotated)).toEqual({ id: 'health-record' });
    await expect(new BackupRecoveryService(oldPipeline).restoreBackup(rotated)).rejects.toThrow();
  });

  it('rotates a backup key and preserves the recovered payload', async () => {
    const oldKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const newKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const oldPipeline = createPipeline(oldKey, 1);
    const newPipeline = createPipeline(newKey, 2);
    const oldService = new BackupRecoveryService(oldPipeline);
    const newService = new BackupRecoveryService(newPipeline);
    const backup = await oldService.createBackup({ id: 'record-rotation', value: 42 }, '1');

    const rotated = await newService.reEncryptBackup(
      backup,
      { resolve: async () => oldPipeline },
      '2',
    );

    expect(rotated.keyVersion).toBe('2');
    expect(await newService.restoreBackup(rotated)).toEqual({ id: 'record-rotation', value: 42 });
  });
});
