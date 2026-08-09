import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { PersistentStorageCryptoKeyProvider } from './persistentCryptoKeyProvider';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

describe('persistent storage crypto key provider', () => {
  it('persists the AES-GCM key and recovers it across provider instances', async () => {
    const databaseName = `persistent-key-test-${crypto.randomUUID()}`;
    const first = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
      'recovery-key-v1',
    );
    const firstKey = await first.getKey();
    const plaintext = new TextEncoder().encode('persistent-recovery');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, firstKey, plaintext);

    const second = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
      'recovery-key-v1',
    );
    const recoveredKey = await second.getKey();
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, recoveredKey, ciphertext);

    expect(new TextDecoder().decode(decrypted)).toBe('persistent-recovery');
    expect(await second.exportKey()).toEqual(await first.exportKey());
    expect(await second.getCurrentKeyVersion()).toBe(1);
  });

  it('keeps the previous key decryptable after rotation', async () => {
    const databaseName = `persistent-key-rotation-test-${crypto.randomUUID()}`;
    const provider = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
      'rotation-key',
    );

    const firstKey = await provider.getKey();
    const firstVersion = await provider.getCurrentKeyVersion();
    const plaintext = new TextEncoder().encode('before-rotation');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, firstKey, plaintext);

    await provider.rotate();

    expect(await provider.getCurrentKeyVersion()).toBe(firstVersion + 1);
    const historicalKey = await provider.getKey(firstVersion);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, historicalKey, ciphertext);

    expect(new TextDecoder().decode(decrypted)).toBe('before-rotation');
  });

  it('restores a historical key without changing the current key version', async () => {
    const databaseName = `persistent-key-recovery-test-${crypto.randomUUID()}`;
    const first = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName));
    const originalKey = await first.getOrCreate('recovery-key');
    const originalJwk = await crypto.subtle.exportKey('jwk', originalKey);
    await first.rotate('recovery-key');
    expect(await first.getCurrentVersion('recovery-key')).toBe(2);

    const recovered = new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName));
    await recovered.importKeyForVersion('recovery-key', originalJwk, 1);

    expect(await recovered.getCurrentVersion('recovery-key')).toBe(2);
    const historical = await recovered.getVersion('recovery-key', 1);
    expect(await crypto.subtle.exportKey('jwk', historical)).toEqual(originalJwk);
  });

  it('rejects invalid key versions', async () => {
    const provider = new PersistentCryptoKeyProvider(
      new IndexedDbCryptoKeyStore(`persistent-key-validation-test-${crypto.randomUUID()}`),
    );

    await expect(provider.getVersion('key', 0)).rejects.toThrow('Invalid crypto key version: 0');
    await expect(provider.getVersion('key', -1)).rejects.toThrow('Invalid crypto key version: -1');
    await expect(provider.getVersion('key', 1.5)).rejects.toThrow('Invalid crypto key version: 1.5');
  });
});
