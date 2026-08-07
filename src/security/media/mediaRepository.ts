import { EncryptedBlobStore } from './encryptedBlobStore';
import type { EncryptedBlobRecord } from './encryptedBlobStore';

export class MediaRepository {
  constructor(private readonly store = new EncryptedBlobStore()) {}

  save(record: EncryptedBlobRecord) {
    return this.store.save(record);
  }

  get(id: string) {
    return this.store.get(id);
  }

  remove(id: string) {
    return this.store.remove(id);
  }
}
