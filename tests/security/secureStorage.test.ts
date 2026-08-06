import { describe, expect, it } from 'vitest';
import { MemorySecureStorage } from '../../src/security/storage/secureStorage';

describe('Secure Storage', () => {
  it('stores and retrieves encrypted boundary records', async () => {
    const storage = new MemorySecureStorage();
    await storage.set({ id: 'health-1', payload: { value: true }, createdAt: 1, updatedAt: 1, version: 1 });
    expect(await storage.get('health-1')).not.toBeNull();
  });
});
