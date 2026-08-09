import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { IndexedDbRepository } from "../src/storage/indexedDbRepository";
import { createCryptoPipeline, createStorageService } from "../src/storage/repository/storageServiceFactory";

const databases = ["health-companion", "low-cost-health-companion"];

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

describe("storage service encrypted end-to-end flow", () => {
  beforeEach(async () => {
    for (const database of databases) await deleteDatabase(database);
  });

  it("migrates cleartext storage, persists encrypted data, and restores it after a fresh pipeline instance", async () => {
    const legacy = new IndexedDbRepository();
    const record = {
      id: "e2e-health-record",
      schemaVersion: 1,
      createdAt: "2026-08-09T15:00:00.000Z",
      updatedAt: "2026-08-09T15:00:00.000Z",
      type: "blood-pressure",
      payload: { systolic: 128, diastolic: 82, unit: "mmHg" },
    };

    await legacy.save({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      type: record.type,
      payload: record.payload,
    });
    const firstPipeline = await createCryptoPipeline();
    const firstService = await createStorageService("e2e", firstPipeline);
    const first = await firstService.get(record.id);

    expect(first).toEqual(record);
    expect(await legacy.listAll()).toEqual([]);

    const secondPipeline = await createCryptoPipeline();
    const secondService = await createStorageService("e2e-restarted", secondPipeline);
    const restored = await secondService.get(record.id);

    expect(restored).toEqual(record);
  });
});
