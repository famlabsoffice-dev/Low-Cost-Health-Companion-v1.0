import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IndexedDbSecureStorage } from '../../src/security/storage/indexedDbSecureStorage';

describe('secure storage roundtrip', () => {
  it('stores and reads encrypted payload records', async () => {
    const storage = new IndexedDbSecureStorage();
    const record = {
      id: 'roundtrip-test',
      payload: {
        ciphertext: 'ciphertext',
        iv: 'iv',
        algorithm: 'AES-GCM' as const,
        version: 1,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    await storage.set(record);
    const restored = await storage.get<typeof record.payload>('roundtrip-test');

    expect(restored).toEqual(record);
    await storage.remove('roundtrip-test');
  });
});
