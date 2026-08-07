import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';
import { IndexedDbCryptoKeyRecoveryAdapter } from './indexedDbCryptoKeyRecoveryAdapter';

describe('backup restore end to end flow', () => {
  it('restores encrypted backup with recovered crypto key metadata', async () => {
    const backupStore = new IndexedDbBackupAdapter('restore-e2e');
    const keyStore = new IndexedDbCryptoKeyRecoveryAdapter('restore-keys-e2e');

    const key = { kty: 'oct', k: 'test-key', alg: 'A256GCM', ext: true };
    const envelope = {
      version: 2,
      keyVersion: 'key-v2',
      createdAt: Date.now(),
      payload: { ciphertext: 'encrypted-health-record', iv: 'iv' }
    };

    await keyStore.save(envelope.keyVersion, key);
    await backupStore.put('backup', envelope);

    expect(await keyStore.load('key-v2')).toEqual(key);
    expect(await backupStore.get('backup')).toEqual(envelope);
  });
});
