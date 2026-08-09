import type { EncryptedSecureRecord, SecureStorage } from './storageTypes';
import { validateEncryptedSecureRecord } from './storageSchemas';

export class MemorySecureStorage implements SecureStorage {
  private readonly store = new Map<string, EncryptedSecureRecord>();

  async set(record: EncryptedSecureRecord): Promise<void> {
    if (!validateEncryptedSecureRecord(record)) throw new Error('Invalid encrypted secure record');
    this.store.set(record.id, record);
  }

  async get(id: string): Promise<EncryptedSecureRecord | null> {
    return this.store.get(id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
