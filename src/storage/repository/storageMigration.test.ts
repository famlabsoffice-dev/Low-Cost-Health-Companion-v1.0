import { describe, expect, it, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IndexedDbRepository, type HealthRecord } from "../indexedDbRepository";
import { IndexedDbStorageRepository } from "./storageRepository";
import { CleartextToEncryptedStorageMigration } from "./storageMigration";
import { migratedHealthRecordSchema } from "./migrationSchema";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { DefaultCryptoPipeline, type CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import type { CryptoKeyProvider, EncryptedPayload } from "../../security/crypto/cryptoTypes";

const SOURCE_DB = "health-companion";
const TARGET_DB = "low-cost-health-companion";

const record = (id: string, systolic = 128): HealthRecord => ({
  id,
  createdAt: "2026-08-09T12:00:00.000Z",
  updatedAt: "2026-08-09T12:05:00.000Z",
  type: "blood-pressure",
  payload: { systolic, diastolic: 82, unit: "mmHg" },
});

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function createPipeline(): Promise<CryptoPipeline> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const keyProvider: CryptoKeyProvider = {
    getKey: async () => key,
    getCurrentKeyVersion: async () => 1,
  };
  return new DefaultCryptoPipeline(new WebCryptoEngine(keyProvider));
}

describe("cleartext to encrypted storage migration", () => {
  beforeEach(async () => {
    await deleteDatabase(SOURCE_DB);
    await deleteDatabase(TARGET_DB);
  });

  afterEach(async () => {
    await deleteDatabase(SOURCE_DB);
    await deleteDatabase(TARGET_DB);
  });

  it("migrates, validates encrypted records, and removes the legacy records", async () => {
    const legacy = new IndexedDbRepository();
    const pipeline = await createPipeline();
    const encrypted = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const migration = new CleartextToEncryptedStorageMigration(legacy, encrypted);
    const first = record("legacy-001");
    const second = record("legacy-002");

    await legacy.save(first);
    await legacy.save(second);

    await expect(migration.migrate()).resolves.toEqual({ migrated: 2 });
    await expect(legacy.get(first.id)).resolves.toBeUndefined();
    await expect(legacy.get(second.id)).resolves.toBeUndefined();
    await expect(encrypted.get(first.id)).resolves.toEqual({ ...first, schemaVersion: 1 });
    await expect(encrypted.get(second.id)).resolves.toEqual({ ...second, schemaVersion: 1 });

    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open(TARGET_DB, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("secure-storage", "readonly");
        const getRequest = tx.objectStore("secure-storage").get(first.id);
        getRequest.onsuccess = () => {
          resolve(getRequest.result);
          db.close();
        };
        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };
      request.onerror = () => reject(request.error);
    });

    expect(raw).toMatchObject({ id: first.id });
    expect(raw).not.toMatchObject({ payload: first.payload });
    expect((raw as { payload: EncryptedPayload }).payload.algorithm).toBe("AES-GCM");
    expect((raw as { payload: EncryptedPayload }).payload.keyVersion).toBe(1);
  });

  it("rolls back encrypted writes when migration fails and keeps legacy data intact", async () => {
    const legacy = new IndexedDbRepository();
    const realPipeline = await createPipeline();
    let encryptCount = 0;
    const failingPipeline: CryptoPipeline = {
      encryptPayload: async <T>(payload: T) => {
        encryptCount += 1;
        if (encryptCount === 2) throw new Error("migration encryption failure");
        return realPipeline.encryptPayload(payload);
      },
      decryptPayload: <T>(payload: EncryptedPayload) => realPipeline.decryptPayload<T>(payload),
    };
    const encrypted = new IndexedDbStorageRepository(migratedHealthRecordSchema, failingPipeline);
    const migration = new CleartextToEncryptedStorageMigration(legacy, encrypted);
    const first = record("rollback-001");
    const second = record("rollback-002");

    await legacy.save(first);
    await legacy.save(second);

    await expect(migration.migrate()).rejects.toThrow("migration encryption failure");
    await expect(legacy.get(first.id)).resolves.toEqual(first);
    await expect(legacy.get(second.id)).resolves.toEqual(second);
    await expect(encrypted.get(first.id)).resolves.toBeNull();
    await expect(encrypted.get(second.id)).resolves.toBeNull();
  });

  it("refuses conflicting encrypted data and preserves legacy data", async () => {
    const legacy = new IndexedDbRepository();
    const pipeline = await createPipeline();
    const encrypted = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const migration = new CleartextToEncryptedStorageMigration(legacy, encrypted);
    const source = record("conflict-001", 128);
    const conflicting = { ...record("conflict-001", 140), schemaVersion: 1 };

    await legacy.save(source);
    await encrypted.save(conflicting);

    await expect(migration.migrate()).rejects.toThrow("Encrypted migration conflict for record: conflict-001");
    await expect(legacy.get(source.id)).resolves.toEqual(source);
    await expect(encrypted.get(source.id)).resolves.toEqual(conflicting);
  });

  it("is idempotent after a successful migration", async () => {
    const legacy = new IndexedDbRepository();
    const pipeline = await createPipeline();
    const encrypted = new IndexedDbStorageRepository(migratedHealthRecordSchema, pipeline);
    const migration = new CleartextToEncryptedStorageMigration(legacy, encrypted);
    const source = record("idempotent-001");

    await legacy.save(source);
    await expect(migration.migrate()).resolves.toEqual({ migrated: 1 });
    await expect(migration.migrate()).resolves.toEqual({ migrated: 0 });
    await expect(encrypted.get(source.id)).resolves.toEqual({ ...source, schemaVersion: 1 });
  });
});
