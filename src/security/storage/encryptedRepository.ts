import { SecureStorage, SecureRecord } from './storageTypes';

export class EncryptedRepository {
  constructor(private readonly storage: SecureStorage) {}

  save<T>(record: SecureRecord<T>) {
    return this.storage.set(record);
  }

  load<T>(id: string) {
    return this.storage.get<T>(id);
  }

  delete(id: string) {
    return this.storage.remove(id);
  }
}
