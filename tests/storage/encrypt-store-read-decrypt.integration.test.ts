import { describe, expect, it } from 'vitest';
import { IndexedDbSecureStorage } from '../../src/security/storage/indexedDbSecureStorage';

describe('secure storage roundtrip', () => {
  it('stores and reads encrypted payload records', async () => {
    const storage = new IndexedDbSecureStorage();
    const record = {
      id: 'roundtrip-test',
      encrypted: 'ciphertext',
      iv: 'iv',
      createdAt: Date.now(),
    };

    await storage.set(record);
    const restored = await storage.get<typeof record>('roundtrip-test');

    expect(restored).toEqual(record);
    await storage.remove('roundtrip-test');
  });
});
