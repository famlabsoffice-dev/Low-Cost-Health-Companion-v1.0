import { SecureRecord, SecureStorage } from './storageTypes';
import { validateSecureRecord } from './storageSchemas';

export class MemorySecureStorage implements SecureStorage {
  private readonly store = new Map<string, SecureRecord>();

  async set<T>(record: SecureRecord<T>): Promise<void> {
    if (!validateSecureRecord(record)) throw new Error('Invalid secure record');
    this.store.set(record.id, record);
  }

  async get<T>(id: string): Promise<SecureRecord<T> | null> {
    return (this.store.get(id) as SecureRecord<T> | undefined) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
