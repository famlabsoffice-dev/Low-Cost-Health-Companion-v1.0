import { IndexedDbRepository } from "../indexedDbRepository";
import { migratedHealthRecordSchema, type MigratedHealthRecord } from "./migrationSchema";
import { CleartextToEncryptedStorageMigration, type StorageMigrationResult } from "./storageMigration";
import { IndexedDbStorageRepository } from "./storageRepository";
import { createCryptoPipeline } from "./storageServiceFactory";

export async function migrateCleartextHealthRecords(): Promise<StorageMigrationResult> {
  const cryptoPipeline = await createCryptoPipeline();
  const legacyRepository = new IndexedDbRepository();
  const encryptedRepository = new IndexedDbStorageRepository<MigratedHealthRecord>(
    migratedHealthRecordSchema,
    cryptoPipeline,
  );

  return new CleartextToEncryptedStorageMigration(
    legacyRepository,
    encryptedRepository,
  ).migrate();
}
