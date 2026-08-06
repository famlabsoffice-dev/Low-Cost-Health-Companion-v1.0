import { describe, expect, it } from 'vitest';
import { EncryptedBlobStore } from '../../src/security/media/encryptedBlobStore';

describe('EncryptedBlobStore', () => {
  it('stores and retrieves encrypted media records', async () => {
    const store = new EncryptedBlobStore();
    await store.save({
      id: 'test',
      mimeType: 'audio/webm',
      encrypted: new ArrayBuffer(4),
      iv: 'iv',
      createdAt: Date.now()
    });

    expect(await store.get('test')).not.toBeNull();
  });
});
