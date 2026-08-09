import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { CryptoPipeline } from "../src/security/crypto/cryptoPipeline";
import type { EncryptedPayload } from "../src/security/crypto/cryptoTypes";
import { migrateLegacyHealthRecords } from "../src/storage/storageMigration";

const LEGACY_DATABASE_NAME = "health-companion";
const LEGACY_STORE_NAME = "health-records";
const SECURE_DATABASE_NAME = "low-cost-health-companion";
const SECURE_STORE_NAME = "secure-storage";
const MIGRATION_MARKER_ID = "__migration__:legacy-health-records:v1";

const cryptoPipeline: CryptoPipeline = {
  async encryptPayload<T>(payload: T): Promise<EncryptedPayload> {
    return {
      version: 1,
      iv: "test-iv",
      algorithm: "AES-GCM",
      keyVersion: 1,
      ciphertext: btoa(JSON.stringify(payload)),
    };
  },
  async decryptPayload<T>(payload: EncryptedPayload): Promise<T> {
    return JSON.parse(atob(payload.ciphertext)) as T;
  },
};

function openDatabase(name: string, store: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store)) {
        request.result.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedLegacyRecord(): Promise<void> {
  const database = await openDatabase(LEGACY_DATABASE_NAME, LEGACY_STORE_NAME);
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LEGACY_STORE_NAME, "readwrite");
    transaction.objectStore(LEGACY_STORE_NAME).put({
      id: "record-1",
      createdAt: "2026-08-09T14:00:00.000Z",
      updatedAt: "2026-08-09T14:01:00.000Z",
      type: "blood-pressure",
      payload: { systolic: 120, diastolic: 80 },
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function readAll(name: string, store: string): Promise<unknown[]> {
  const database = await openDatabase(name, store);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(store, "readonly");
      const request = transaction.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(SECURE_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});

describe("legacy health storage migration", () => {
  it("migrates once, encrypts the destination transaction, and removes cleartext records", async () => {
    await seedLegacyRecord();

    const first = await migrateLegacyHealthRecords(cryptoPipeline);
    expect(first).toEqual({ status: "migrated", migratedCount: 1 });

    const legacyRecords = await readAll(LEGACY_DATABASE_NAME, LEGACY_STORE_NAME);
    expect(legacyRecords).toHaveLength(1);
    expect(legacyRecords[0]).toMatchObject({
      id: MIGRATION_MARKER_ID,
      migration: "legacy-health-records-v1",
      migratedCount: 1,
    });

    const secureRecords = await readAll(SECURE_DATABASE_NAME, SECURE_STORE_NAME);
    expect(secureRecords).toHaveLength(2);
    expect(secureRecords).toContainEqual(expect.objectContaining({ id: "record-1" }));
    expect(secureRecords).toContainEqual(expect.objectContaining({ id: MIGRATION_MARKER_ID }));
    expect(JSON.stringify(secureRecords)).not.toContain("blood-pressure");

    const second = await migrateLegacyHealthRecords(cryptoPipeline);
    expect(second).toEqual({ status: "not-needed", migratedCount: 0 });
  });

  it("completes cleanly when the legacy store is empty", async () => {
    const result = await migrateLegacyHealthRecords(cryptoPipeline);
    expect(result).toEqual({ status: "not-needed", migratedCount: 0 });

    const legacyRecords = await readAll(LEGACY_DATABASE_NAME, LEGACY_STORE_NAME);
    expect(legacyRecords).toHaveLength(1);
    expect(legacyRecords[0]).toMatchObject({
      id: MIGRATION_MARKER_ID,
      migration: "legacy-health-records-v1",
      migratedCount: 0,
    });
  });
});
