import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbBackupAdapter } from './indexedDbBackupAdapter';

describe('IndexedDB crypto backup recovery browser flow', () => {
  it('persists and restores encrypted backup envelopes', async () => {
    const adapter = new IndexedDbBackupAdapter('health-companion-browser-e2e');
    const envelope = {
      version: 2,
      keyVersion: 'key-v2',
      createdAt: Date.now(),
      payload: {
        iv: 'iv',
        ciphertext: 'ciphertext'
      }
    };

    await adapter.put('restore-test', envelope);
    const restored = await adapter.get<typeof envelope>('restore-test');

    expect(restored).toEqual(envelope);
  });
});
