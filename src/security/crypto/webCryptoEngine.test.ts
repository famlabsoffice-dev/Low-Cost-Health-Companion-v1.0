import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { WebCryptoEngine } from './webCryptoEngine';
import { PersistentStorageCryptoKeyProvider } from './persistentCryptoKeyProvider';
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

describe('WebCryptoEngine', () => {
  it('records the key version and decrypts historical payloads after rotation', async () => {
    const databaseName = `crypto-engine-test-${crypto.randomUUID()}`;
    const provider = new PersistentStorageCryptoKeyProvider(
      new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
      'engine-key',
    );
    const engine = new WebCryptoEngine(provider);

    const encrypted = await engine.encrypt('historical-payload');
    expect(encrypted.keyVersion).toBe(1);

    await provider.rotate();

    expect(await engine.decrypt(encrypted)).toBe('historical-payload');
  });
});
