import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import type { EncryptedSecureRecord, SecureRecord, SecureStorage } from './storageTypes';
import { validateEncryptedSecureRecord, validateSecureRecord } from './storageSchemas';

export class EncryptedRepository {
  constructor(
    private readonly storage: SecureStorage,
    private readonly cryptoPipeline: CryptoPipeline,
  ) {}

  async save<T>(record: SecureRecord<T>) {
    const encrypted = await this.cryptoPipeline.encryptPayload(record.payload);

    const encryptedRecord: EncryptedSecureRecord = {
      id: record.id,
      payload: encrypted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    };

    return this.storage.set(encryptedRecord);
  }

  async load<T>(id: string) {
    const record = await this.storage.get<T>(id);
    if (!record) return null;

    if (!validateEncryptedSecureRecord(record)) {
      throw new Error('Invalid encrypted record');
    }

    const payload = await this.cryptoPipeline.decryptPayload<T>(record.payload);

    const decrypted: SecureRecord<T> = {
      id: record.id,
      payload,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    };

    if (!validateSecureRecord(decrypted)) {
      throw new Error('Invalid decrypted record');
    }

    return decrypted;
  }

  delete(id: string) {
    return this.storage.remove(id);
  }
}
