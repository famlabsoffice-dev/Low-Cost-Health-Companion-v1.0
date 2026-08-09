import type { IndexedDbRepository } from "../indexedDbRepository";
import type { HealthRecord } from "../healthRecordSchema";
import type { StorageRepository } from "./storageRepository";
import { migratedHealthRecordSchema, type MigratedHealthRecord } from "./migrationSchema";

export interface StorageMigrationResult {
  migrated: number;
}

export class CleartextToEncryptedStorageMigration {
  constructor(
    private readonly legacyRepository: IndexedDbRepository,
    private readonly encryptedRepository: StorageRepository<MigratedHealthRecord>,
  ) {}

  async migrate(): Promise<StorageMigrationResult> {
    const legacyRecords = await this.legacyRepository.listAll();
    if (legacyRecords.length === 0) return { migrated: 0 };

    const migratedIds: string[] = [];

    try {
      for (const legacyRecord of legacyRecords) {
        const migrated = this.toMigratedRecord(legacyRecord);
        await this.encryptedRepository.save(migrated);
        migratedIds.push(migrated.id);
      }

      for (const id of migratedIds) {
        const restored = await this.encryptedRepository.get(id);
        if (!restored || !migratedHealthRecordSchema.safeParse(restored).success) {
          throw new Error(`Encrypted migration validation failed for record: ${id}`);
        }
      }

      await this.legacyRepository.removeMany(migratedIds);
      return { migrated: migratedIds.length };
    } catch (error) {
      await Promise.allSettled(migratedIds.map((id) => this.encryptedRepository.remove(id)));
      throw error;
    }
  }

  private toMigratedRecord(record: HealthRecord): MigratedHealthRecord {
    return migratedHealthRecordSchema.parse({
      id: record.id,
      schemaVersion: 1,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      type: record.type,
      payload: record.payload,
    });
  }
}
