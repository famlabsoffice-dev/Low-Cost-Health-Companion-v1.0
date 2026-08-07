import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbCryptoKeyRecoveryAdapter } from './indexedDbCryptoKeyRecoveryAdapter';

describe('IndexedDB crypto key recovery adapter', () => {
  it('stores and restores recovery keys', async () => {
    const adapter = new IndexedDbCryptoKeyRecoveryAdapter('test-key-recovery');
    const key = { kty: 'oct', k: 'test', alg: 'A256GCM', ext: true } as JsonWebKey;

    await adapter.save('key-v2', key);

    expect(await adapter.load('key-v2')).toEqual(key);
  });
});
