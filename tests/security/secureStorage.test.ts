import { describe, expect, it } from 'vitest';
import { MemorySecureStorage } from '../../src/security/storage/secureStorage';

describe('Secure Storage', () => {
  it('stores and retrieves encrypted boundary records', async () => {
    const storage = new MemorySecureStorage();
    const record = {
      id: 'health-1',
      payload: {
        ciphertext: 'ciphertext',
        iv: 'iv',
        algorithm: 'AES-GCM' as const,
        version: 1 as const,
        keyVersion: 1,
      },
      createdAt: 1,
      updatedAt: 1,
      version: 1,
    };

    await storage.set(record);
    expect(await storage.get('health-1')).toEqual(record);
  });
});
