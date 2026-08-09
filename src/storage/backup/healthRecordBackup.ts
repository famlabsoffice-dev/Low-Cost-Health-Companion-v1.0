import type { CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { healthRecordSchema, type HealthRecord } from "../healthRecordSchema";
import { IndexedDbRepository } from "../indexedDbRepository";
import { StorageBackupService } from "./storageBackup";

export class HealthRecordBackupService {
  private readonly backupService: StorageBackupService<HealthRecord>;

  constructor(
    private readonly repository = new IndexedDbRepository(),
    cryptoPipeline: CryptoPipeline,
  ) {
    this.backupService = new StorageBackupService(cryptoPipeline, (entry) => healthRecordSchema.parse(entry));
  }

  async createBackup(): Promise<string> {
    return this.backupService.export(await this.repository.listAll());
  }

  async restoreBackup(serialized: string): Promise<number> {
    const backup = await this.backupService.import(serialized);
    await this.repository.replaceAll(backup.entries);
    return backup.entries.length;
  }
}
