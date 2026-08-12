import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from './persistentCryptoKeyProvider';
import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';

describe('key lifecycle and retirement audit', () => {
  it('keeps the current key usable, makes retired versions unavailable, and prevents current-key retirement', async () => {
    const databaseName = `key-lifecycle-audit-${crypto.randomUUID()}`;
    const provider = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
    );

    await provider.initialize();
    expect(await provider.getCurrentKeyVersion()).toBe(1);
    await expect(provider.getKey(1)).resolves.toBeDefined();
    await expect(provider.exportKeyVersion(1)).resolves.toBeDefined();

    await provider.rotate();
    expect(await provider.getCurrentKeyVersion()).toBe(2);
    await expect(provider.getKey(2)).resolves.toBeDefined();
    await expect(provider.exportKeyVersion(2)).resolves.toBeDefined();

    await provider.retireVersion(1);
    expect(await provider.getCurrentKeyVersion()).toBe(2);
    await expect(provider.getKey(1)).rejects.toThrow('Crypto key version was not found');
    await expect(provider.exportKeyVersion(1)).rejects.toThrow('Crypto key version was not found');
    await expect(provider.getKey(2)).resolves.toBeDefined();
    await expect(provider.exportKeyVersion(2)).resolves.toBeDefined();
    await expect(provider.retireVersion(2)).rejects.toThrow('Cannot retire current crypto key version');
  });

  it('retains the previous version until retirement and removes the failed rotation version during rollback', async () => {
    const databaseName = `key-lifecycle-rollback-audit-${crypto.randomUUID()}`;
    const provider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName));

    await provider.getOrCreate();
    await provider.rotate();
    expect(await provider.getCurrentVersion()).toBe(2);
    await expect(provider.getVersion('device-root-key', 1)).resolves.toBeDefined();
    await expect(provider.getVersion('device-root-key', 2)).resolves.toBeDefined();

    await provider.rollbackRotation('device-root-key', 1, 2);
    expect(await provider.getCurrentVersion()).toBe(1);
    await expect(provider.getVersion('device-root-key', 1)).resolves.toBeDefined();
    await expect(provider.getVersion('device-root-key', 2)).rejects.toThrow('Crypto key version was not found');
  });
});
