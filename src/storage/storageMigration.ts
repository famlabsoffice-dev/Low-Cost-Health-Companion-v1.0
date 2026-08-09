import type { CryptoPipeline } from "../security/crypto/cryptoPipeline";
import { healthRecordSchema, type HealthRecord } from "./healthRecordSchema";

const LEGACY_DATABASE_NAME = "health-companion";
const LEGACY_STORE_NAME = "health-records";
const SECURE_DATABASE_NAME = "low-cost-health-companion";
const SECURE_STORE_NAME = "secure-storage";
const LEGACY_MIGRATION_MARKER_ID = "__migration__:legacy-health-records:v1";
const MIGRATION_SCHEMA_VERSION = 1;

interface SecureStoredRecord {
  id: string;
  payload: Awaited<ReturnType<CryptoPipeline["encryptPayload"]>>;
}

interface MigrationMarker {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  migration: "legacy-health-records-v1";
  migratedCount: number;
}

export interface LegacyStorageMigrationResult {
  status: "not-needed" | "migrated";
  migratedCount: number;
}

export async function migrateLegacyHealthRecords(
  cryptoPipeline: CryptoPipeline,
): Promise<LegacyStorageMigrationResult> {
  const legacyDatabase = await openDatabase(LEGACY_DATABASE_NAME, LEGACY_STORE_NAME);

  try {
    const state = await readLegacyMigrationState(legacyDatabase);
    if (state === "completed") {
      return { status: "not-needed", migratedCount: 0 };
    }

    const records = await readLegacyRecords(legacyDatabase);
    if (records.length === 0) {
      await markLegacyMigrationCompleted(legacyDatabase, 0);
      return { status: "not-needed", migratedCount: 0 };
    }

    const encryptedRecords = await Promise.all(
      records.map(async (record) => ({
        id: record.id,
        payload: await cryptoPipeline.encryptPayload({
          ...record,
          schemaVersion: MIGRATION_SCHEMA_VERSION,
        }),
      })),
    );

    const marker: MigrationMarker = {
      id: LEGACY_MIGRATION_MARKER_ID,
      schemaVersion: MIGRATION_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migration: "legacy-health-records-v1",
      migratedCount: records.length,
    };

    const secureDatabase = await openDatabase(SECURE_DATABASE_NAME, SECURE_STORE_NAME);
    try {
      await commitEncryptedMigration(secureDatabase, encryptedRecords, marker, cryptoPipeline);
    } finally {
      secureDatabase.close();
    }

    await removeLegacyRecordsAndMarkComplete(legacyDatabase, records.map((record) => record.id), records.length);

    return { status: "migrated", migratedCount: records.length };
  } finally {
    legacyDatabase.close();
  }
}

async function commitEncryptedMigration(
  database: IDBDatabase,
  records: SecureStoredRecord[],
  marker: MigrationMarker,
  cryptoPipeline: CryptoPipeline,
): Promise<void> {
  const encryptedMarker: SecureStoredRecord = {
    id: marker.id,
    payload: await cryptoPipeline.encryptPayload(marker),
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SECURE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SECURE_STORE_NAME);

    for (const record of records) {
      store.put(record);
    }
    store.put(encryptedMarker);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Encrypted storage migration transaction aborted"));
  });
}

async function readLegacyMigrationState(database: IDBDatabase): Promise<"pending" | "completed"> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LEGACY_STORE_NAME, "readonly");
    const request = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_MIGRATION_MARKER_ID);
    request.onsuccess = () => resolve(request.result?.migration === "legacy-health-records-v1" ? "completed" : "pending");
    request.onerror = () => reject(request.error);
  });
}

async function readLegacyRecords(database: IDBDatabase): Promise<HealthRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LEGACY_STORE_NAME, "readonly");
    const request = transaction.objectStore(LEGACY_STORE_NAME).getAll();
    request.onsuccess = () => {
      try {
        const records = request.result
          .filter((record: unknown) => {
            if (!record || typeof record !== "object") return false;
            return (record as { id?: unknown }).id !== LEGACY_MIGRATION_MARKER_ID;
          })
          .map((record: unknown) => healthRecordSchema.parse(record));
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function markLegacyMigrationCompleted(database: IDBDatabase, migratedCount: number): Promise<void> {
  const now = new Date().toISOString();
  const marker: MigrationMarker = {
    id: LEGACY_MIGRATION_MARKER_ID,
    schemaVersion: MIGRATION_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    migration: "legacy-health-records-v1",
    migratedCount,
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LEGACY_STORE_NAME, "readwrite");
    transaction.objectStore(LEGACY_STORE_NAME).put(marker);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Legacy storage migration marker transaction aborted"));
  });
}

async function removeLegacyRecordsAndMarkComplete(
  database: IDBDatabase,
  ids: string[],
  migratedCount: number,
): Promise<void> {
  const now = new Date().toISOString();
  const marker: MigrationMarker = {
    id: LEGACY_MIGRATION_MARKER_ID,
    schemaVersion: MIGRATION_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    migration: "legacy-health-records-v1",
    migratedCount,
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LEGACY_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LEGACY_STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
    store.put(marker);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Legacy storage migration cleanup transaction aborted"));
  });
}

function openDatabase(databaseName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`${databaseName} database open blocked`));
  });
}
