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
  });
});
