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

    for (const migrated of migratedRecords) {
      const existing = await this.encryptedRepository.get(migrated.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(migrated)) {
        throw new Error(`Encrypted migration conflict for record: ${migrated.id}`);
      }
    }

    const recordsToWrite = [];
    for (const migrated of migratedRecords) {
      const existing = await this.encryptedRepository.get(migrated.id);
      if (!existing) recordsToWrite.push(migrated);
    }

    if (recordsToWrite.length > 0) {
      await this.encryptedRepository.saveMany(recordsToWrite);
    }

    for (const migrated of migratedRecords) {
      const restored = await this.encryptedRepository.get(migrated.id);
      if (!restored || !migratedHealthRecordSchema.safeParse(restored).success) {
        throw new Error(`Encrypted migration validation failed for record: ${migrated.id}`);
      }
      if (JSON.stringify(restored) !== JSON.stringify(migrated)) {
        throw new Error(`Encrypted migration integrity validation failed for record: ${migrated.id}`);
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
