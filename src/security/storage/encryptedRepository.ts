import type { CryptoEngine } from '../crypto/cryptoTypes';
import { SecureStorage, SecureRecord, EncryptedSecureRecord } from './storageTypes';
import { validateEncryptedSecureRecord, validateSecureRecord } from './storageSchemas';

export class EncryptedRepository {
  constructor(
    private readonly storage: SecureStorage,
    private readonly crypto?: CryptoEngine,
  ) {}

  async save<T>(record: SecureRecord<T>) {
    if (!this.crypto) return this.storage.set(record);

    const encrypted = await this.crypto.encrypt(JSON.stringify(record.payload));
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

    if (!this.crypto) return record as SecureRecord<T>;

    if (!validateEncryptedSecureRecord(record)) throw new Error('Invalid encrypted record');

    const payload = JSON.parse(await this.crypto.decrypt(record.payload)) as T;
    const decrypted: SecureRecord<T> = {
      id: record.id,
      payload,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    };

    if (!validateSecureRecord(decrypted)) throw new Error('Invalid decrypted record');
    return decrypted;
  }

  delete(id: string) {
    return this.storage.remove(id);
  }
}
