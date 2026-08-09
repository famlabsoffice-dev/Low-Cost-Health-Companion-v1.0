import { beforeEach, describe, expect, it, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IndexedDbRepository, type HealthRecord } from "../indexedDbRepository";
import { migratedHealthRecordSchema } from "./migrationSchema";
import { migrateCleartextHealthRecords } from "./storageMigrationRuntime";
import { IndexedDbStorageRepository } from "./storageRepository";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { DefaultCryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";

const SOURCE_DB = "health-companion";
const TARGET_DB = "low-cost-health-companion";
const SECURITY_DB = "low-cost-health-companion-security";

const record: HealthRecord = {
  id: "runtime-migration-001",
  createdAt: "2026-08-09T12:00:00.000Z",
  updatedAt: "2026-08-09T12:05:00.000Z",
  type: "blood-pressure",
  payload: { systolic: 128, diastolic: 82, unit: "mmHg" },
};

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe("runtime cleartext to encrypted storage migration", () => {
  beforeEach(async () => {
    await deleteDatabase(SOURCE_DB);
    await deleteDatabase(TARGET_DB);
    await deleteDatabase(SECURITY_DB);
  });

  afterEach(async () => {
    await deleteDatabase(SOURCE_DB);
    await deleteDatabase(TARGET_DB);
    await deleteDatabase(SECURITY_DB);
  });

  it("uses the persistent runtime key provider and migrates legacy data", async () => {
    const legacy = new IndexedDbRepository();
    await legacy.save(record);

    await expect(migrateCleartextHealthRecords()).resolves.toEqual({ migrated: 1 });
    await expect(legacy.get(record.id)).resolves.toBeUndefined();

    const pipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider()),
    );
    const encrypted = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    await expect(encrypted.get(record.id)).resolves.toEqual({ ...record, schemaVersion: 1 });
    await expect(new PersistentStorageCryptoKeyProvider().getCurrentKeyVersion()).resolves.toBe(1);
  });
});
