import type { MigratedHealthRecord } from '../storage/repository/migrationSchema';
import type { IndexedDbStorageRepository } from '../storage/repository/storageRepository';
import type { HealthRecord } from './healthRecord';

export class HealthRecordRepository {
  constructor(private readonly repository: IndexedDbStorageRepository<MigratedHealthRecord>) {}

  async save(record: HealthRecord): Promise<void> {
    await this.repository.save({
      id: record.id,
      schemaVersion: 1,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
      type: record.type,
      payload: { value: record.value },
    });
  }

  async get(id: string): Promise<HealthRecord | null> {
    const result = await this.repository.get(id);
    return result ? this.toDomain(result) : null;
  }

  async list(): Promise<HealthRecord[]> {
    return (await this.repository.listAll()).map((record) => this.toDomain(record));
  }

  delete(id: string): Promise<void> {
    return this.repository.remove(id);
  }

  private toDomain(result: MigratedHealthRecord): HealthRecord {
    return {
      id: result.id,
      type: result.type,
      value: 'value' in result.payload ? result.payload.value : result.payload,
      createdAt: Date.parse(result.createdAt),
      updatedAt: Date.parse(result.updatedAt),
    };
  }
}
