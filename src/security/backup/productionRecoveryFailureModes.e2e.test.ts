import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { CryptoKeyProvider } from '../crypto/cryptoTypes';
import { DefaultCryptoPipeline } from '../crypto/cryptoPipeline';
import { WebCryptoEngine } from '../crypto/webCryptoEngine';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';

describe('production backup recovery failure modes', () => {
  it('rejects recovery when the persisted recovery key has been lost', async () => {
    const keyDatabase = `recovery-key-loss-${crypto.randomUUID()}`;
    const backupDatabase = `recovery-key-loss-backup-${crypto.randomUUID()}`;
    const keyId = 'device-root-key';
    const provider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    await provider.getOrCreate(keyId);
    const version = await provider.getCurrentVersion(keyId);
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => provider.getVersion(keyId, requestedVersion ?? version),
      getCurrentKeyVersion: async () => provider.getCurrentVersion(keyId),
    }));
    const service = new BackupRecoveryService(pipeline);
    const backupStore = new IndexedDbBackupAdapter(backupDatabase);
    const backup = await service.createBackup({ id: 'recovery-key-loss-record', value: { bpm: 72 } }, String(version));
    await backupStore.put('backup', backup);

    await provider.rotate(keyId);
    await provider.retireVersion(keyId, version);

    const restartedProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    const restartedPipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => restartedProvider.getVersion(keyId, requestedVersion ?? version),
      getCurrentKeyVersion: async () => restartedProvider.getCurrentVersion(keyId),
    }));
    const restartedService = new BackupRecoveryService(restartedPipeline);
    const persisted = await backupStore.get<BackupEnvelope>('backup');

    await expect(restartedService.restoreWithRecovery(persisted!, {
      resolve: async (requestedVersion) => {
        expect(requestedVersion).toBe(String(version));
        return restartedPipeline;
      },
    })).rejects.toThrow(`Crypto key version was not found: ${keyId}:${version}`);
  });

  it('rejects recovery when the backup references an invalid key version', async () => {
    const keyDatabase = `recovery-wrong-version-${crypto.randomUUID()}`;
    const keyId = 'device-root-key';
    const provider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(keyDatabase));
    await provider.getOrCreate(keyId);
    const version = await provider.getCurrentVersion(keyId);
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => provider.getVersion(keyId, requestedVersion ?? version),
      getCurrentKeyVersion: async () => provider.getCurrentVersion(keyId),
    }));
    const service = new BackupRecoveryService(pipeline);
    const backup = await service.createBackup({ id: 'wrong-version-record' }, String(version));
    const invalidVersionBackup: BackupEnvelope = { ...backup, keyVersion: '999999' };

    await expect(service.restoreWithRecovery(invalidVersionBackup, {
      resolve: async (requestedVersion) => {
        expect(requestedVersion).toBe('999999');
        await provider.getVersion(keyId, Number(requestedVersion));
        return pipeline;
      },
    })).rejects.toThrow(`Crypto key version was not found: ${keyId}:999999`);
  });

  it('rejects recovery when the resolver returns the wrong key material', async () => {
    const sourceKeyDatabase = `recovery-wrong-key-source-${crypto.randomUUID()}`;
    const wrongKeyDatabase = `recovery-wrong-key-target-${crypto.randomUUID()}`;
    const sourceId = 'device-root-key';
    const sourceProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(sourceKeyDatabase));
    await sourceProvider.getOrCreate(sourceId);
    const sourceVersion = await sourceProvider.getCurrentVersion(sourceId);
    const sourcePipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => sourceProvider.getVersion(sourceId, requestedVersion ?? sourceVersion),
      getCurrentKeyVersion: async () => sourceProvider.getCurrentVersion(sourceId),
    }));
    const sourceService = new BackupRecoveryService(sourcePipeline);
    const backup = await sourceService.createBackup({ id: 'wrong-key-record', value: 'protected' }, String(sourceVersion));

    const wrongProvider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(wrongKeyDatabase));
    await wrongProvider.getOrCreate(sourceId);
    const wrongVersion = await wrongProvider.getCurrentVersion(sourceId);
    expect(wrongVersion).toBe(sourceVersion);
    const wrongPipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: async (requestedVersion) => wrongProvider.getVersion(sourceId, requestedVersion ?? wrongVersion),
      getCurrentKeyVersion: async () => wrongProvider.getCurrentVersion(sourceId),
    }));
    const wrongService = new BackupRecoveryService(wrongPipeline);

    await expect(wrongService.restoreWithRecovery(backup, {
      resolve: async () => wrongPipeline,
    })).rejects.toThrow();
  });

  it('rejects corrupted ciphertext before returning restored data', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const provider: CryptoKeyProvider = {
      getKey: async () => key,
      getCurrentKeyVersion: async () => 1,
    };
    const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
    const service = new BackupRecoveryService(pipeline);
    const backup = await service.createBackup({ id: 'corrupted-record', value: { systolic: 128 } }, '1');
    const corrupted: BackupEnvelope = {
      ...backup,
      payload: {
        ...backup.payload,
        ciphertext: `${backup.payload.ciphertext.slice(0, -4)}AAAA`,
      },
    };

    await expect(service.restoreBackup(corrupted)).rejects.toThrow();
  });
});
