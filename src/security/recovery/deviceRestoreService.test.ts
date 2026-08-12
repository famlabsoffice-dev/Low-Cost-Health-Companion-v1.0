import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';
import { DeviceRestoreService, type DeviceRestoreBundle } from './deviceRestoreService';

describe('DeviceRestoreService', () => {
  it('exports an encrypted recovery bundle and restores it into a fresh key store', async () => {
    const keyId = 'device-root-key';
    const passphrase = 'correct horse battery staple';
    const source = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(`device-restore-source-${crypto.randomUUID()}`));
    await source.getOrCreate(keyId);
    const sourceVersion = await source.getCurrentVersion(keyId);
    const sourceJwk = await source.exportKeyVersion(keyId, sourceVersion);
    const service = new DeviceRestoreService(source);

    const bundle = await service.createBundle(keyId, passphrase);
    expect(bundle.version).toBe(1);
    expect(bundle.algorithm).toBe('PBKDF2-AES-GCM');
    expect(bundle.keyVersion).toBe(sourceVersion);
    expect(bundle.ciphertext).not.toContain(sourceJwk.k ?? '');

    const target = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(`device-restore-target-${crypto.randomUUID()}`));
    const targetService = new DeviceRestoreService(target);
    const restoredKey = await targetService.restoreBundle(bundle, passphrase);
    const restoredJwk = await crypto.subtle.exportKey('jwk', restoredKey);
    expect(restoredJwk).toEqual(sourceJwk);
    expect(await target.getCurrentVersion(keyId)).toBe(sourceVersion);
  });

  it('rejects a wrong passphrase and tampered recovery bundle', async () => {
    const provider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(`device-restore-negative-${crypto.randomUUID()}`));
    await provider.getOrCreate();
    const service = new DeviceRestoreService(provider);
    const bundle = await service.createBundle('device-root-key', 'correct horse battery staple');

    await expect(service.restoreBundle(bundle, 'wrong passphrase')).rejects.toThrow('Device restore authentication failed');

    const tampered: DeviceRestoreBundle = { ...bundle, ciphertext: `${bundle.ciphertext}A` };
    await expect(service.restoreBundle(tampered, 'correct horse battery staple')).rejects.toThrow();
  });

  it('rejects weak passphrases before key material is exported', async () => {
    const provider = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(`device-restore-weak-${crypto.randomUUID()}`));
    await provider.getOrCreate();
    const service = new DeviceRestoreService(provider);
    await expect(service.createBundle('device-root-key', 'short')).rejects.toThrow('at least 12 characters');
  });
});
