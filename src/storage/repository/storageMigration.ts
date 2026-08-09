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

    const migratedRecords = legacyRecords.map((legacyRecord) => this.toMigratedRecord(legacyRecord));

    await this.encryptedRepository.saveMany(migratedRecords);

    for (const migrated of migratedRecords) {
      const restored = await this.encryptedRepository.get(migrated.id);
      if (!restored || !migratedHealthRecordSchema.safeParse(restored).success) {
        throw new Error(`Encrypted migration validation failed for record: ${migrated.id}`);
      }
    }

    await this.legacyRepository.removeMany(migratedRecords.map((record) => record.id));
    return { migrated: migratedRecords.length };
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
