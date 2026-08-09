import type { CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { healthRecordSchema, type HealthRecord } from "../healthRecordSchema";
import { IndexedDbStorageRepository, type StorageRepository } from "../repository/storageRepository";
import { StorageBackupService } from "./storageBackup";

export class HealthRecordBackupService {
  private readonly backupService: StorageBackupService<HealthRecord>;

  constructor(
    cryptoPipeline: CryptoPipeline,
    private readonly repository: StorageRepository<HealthRecord> = new IndexedDbStorageRepository(
      healthRecordSchema,
      cryptoPipeline,
    ),
  ) {
    this.backupService = new StorageBackupService(cryptoPipeline, (entry) => healthRecordSchema.parse(entry));
  }

  async createBackup(): Promise<string> {
    return this.backupService.export(await this.repository.listAll());
  }

  async restoreBackup(serialized: string): Promise<number> {
    const backup = await this.backupService.import(serialized);
    const previousEntries = await this.repository.listAll();

    try {
      await this.repository.replaceAll(backup.entries);
    } catch (restoreError) {
      try {
        await this.repository.replaceAll(previousEntries);
      } catch (rollbackError) {
        throw new AggregateError(
          [restoreError, rollbackError],
          "Storage backup restore failed and rollback could not be completed",
        );
      }
      throw restoreError;
    }

    return backup.entries.length;
  }
}
