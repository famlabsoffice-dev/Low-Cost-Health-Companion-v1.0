import { EncryptedRepository } from '../security/storage/encryptedRepository';
import type { HealthRecord } from './healthRecord';

export class HealthRecordRepository {
  constructor(private readonly repository: EncryptedRepository) {}

  save(record: HealthRecord) {
    return this.repository.save({
      id: record.id,
      payload: record,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: 1,
    });
  }

  async get(id: string): Promise<HealthRecord | null> {
    const result = await this.repository.load<HealthRecord>(id);
    return result?.payload ?? null;
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
