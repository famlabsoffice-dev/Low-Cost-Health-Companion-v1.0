import { describe, expect, it } from 'vitest';
import { PersistentCryptoKeyProvider } from '../../src/security/keys/persistentCryptoKeyProvider';

class MemoryCryptoKeyStore {
  private records = new Map<string, { id: string; version: number; algorithm: 'AES-GCM'; key: JsonWebKey; createdAt: number; rotatedAt: number }>();

  async get(id: string) {
    return this.records.get(id);
  }

  async set(record: { id: string; version: number; algorithm: 'AES-GCM'; key: JsonWebKey; createdAt: number; rotatedAt: number }) {
    this.records.set(record.id, record);
  }

  async delete(id: string) {
    this.records.delete(id);
  }
}

describe('PersistentCryptoKeyProvider rotation', () => {
  it('creates and rotates keys with increasing versions', async () => {
    const store = new MemoryCryptoKeyStore();
    const provider = new PersistentCryptoKeyProvider(store);

    await provider.getOrCreate('test-key');
    await provider.rotate('test-key');

    const record = await store.get('test-key');

    expect(record).toBeDefined();
    expect(record?.version).toBe(2);
    expect(record?.algorithm).toBe('AES-GCM');
    expect(record?.key.kty).toBe('oct');
    expect(record?.key.k).toBeTruthy();
  });
});
