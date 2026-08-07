import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbSecureStorage } from '../src/security/storage/indexedDbSecureStorage';
import { EncryptedRepository } from '../src/security/storage/encryptedRepository';


describe('IndexedDbSecureStorage', () => {
  it('persists and loads secure records', async () => {
    const storage = new IndexedDbSecureStorage();
    const repository = new EncryptedRepository(storage);

    await repository.save({
      id: 'record-1',
      payload: { value: 'health-data' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    });

    const result = await repository.load<{ value: string }>('record-1');

    expect(result?.payload.value).toBe('health-data');
  });
});
