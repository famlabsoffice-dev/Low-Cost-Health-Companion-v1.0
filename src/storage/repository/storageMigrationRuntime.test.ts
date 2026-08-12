import { beforeEach, describe, expect, it, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IndexedDbRepository, type HealthRecord } from "../indexedDbRepository";
import { migratedHealthRecordSchema } from "./migrationSchema";
import { CleartextToEncryptedStorageMigration } from "./storageMigration";
import { migrateCleartextHealthRecords } from "./storageMigrationRuntime";
import { IndexedDbStorageRepository } from "./storageRepository";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { DefaultCryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import type { EncryptedPayload } from "../../security/crypto/cryptoTypes";

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

  it("uses the persistent runtime key provider and completes a decryptable encrypted migration", async () => {
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

    const raw = await new Promise<{ id: string; payload: EncryptedPayload }>((resolve, reject) => {
      const request = indexedDB.open(TARGET_DB, 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("secure-storage", "readonly");
        const getRequest = transaction.objectStore("secure-storage").get(record.id);
        getRequest.onsuccess = () => {
          resolve(getRequest.result as { id: string; payload: EncryptedPayload });
          db.close();
        };
        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };
      request.onerror = () => reject(request.error);
    });

    expect(raw.id).toBe(record.id);
    expect(raw.payload.algorithm).toBe("AES-GCM");
    expect(raw.payload.keyVersion).toBe(1);
    expect(raw).not.toMatchObject({ payload: record.payload });

    const restoredAfterReload = new IndexedDbStorageRepository(migratedHealthRecordSchema, new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider()),
    ));
    await expect(restoredAfterReload.get(record.id)).resolves.toEqual({ ...record, schemaVersion: 1 });
  });

  it("preserves legacy cleartext data when persistent encrypted migration detects a conflict", async () => {
    const legacy = new IndexedDbRepository();
    await legacy.save(record);

    const pipeline = new DefaultCryptoPipeline(
      new WebCryptoEngine(new PersistentStorageCryptoKeyProvider()),
    );
    const encrypted = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    await encrypted.save({ ...record, schemaVersion: 1, payload: { systolic: 140, diastolic: 90, unit: "mmHg" } });

    const migration = new CleartextToEncryptedStorageMigration(legacy, encrypted);
    await expect(migration.migrate()).rejects.toThrow(
      `Encrypted migration conflict for record: ${record.id}`,
    );
    await expect(legacy.get(record.id)).resolves.toEqual(record);
    await expect(encrypted.get(record.id)).resolves.toEqual({
      ...record,
      schemaVersion: 1,
      payload: { systolic: 140, diastolic: 90, unit: "mmHg" },
    });
  });
});
