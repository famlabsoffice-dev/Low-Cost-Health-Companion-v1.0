import type { EncryptedSecureRecord, SecureStorage } from './storageTypes';
import { validateEncryptedSecureRecord } from './storageSchemas';

export class EncryptedSecureStorage implements SecureStorage {
  private readonly records = new Map<string, EncryptedSecureRecord>();

  async set(record: EncryptedSecureRecord): Promise<void> {
    if (!validateEncryptedSecureRecord(record)) {
      throw new Error('Invalid encrypted secure record');
    }
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<EncryptedSecureRecord | null> {
    return this.records.get(id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}
