import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from "vitest";
import { createCryptoPipeline, createStorageService } from "../../src/storage/repository/storageServiceFactory";

describe("storage service encrypted roundtrip", () => {
  beforeEach(() => {
    indexedDB.deleteDatabase("low-cost-health-companion");
    indexedDB.deleteDatabase("low-cost-health-companion-security");
  });

  it("encrypts, stores, reads and decrypts a value", async () => {
    const cryptoPipeline = await createCryptoPipeline();
    const storage = await createStorageService("roundtrip_test", cryptoPipeline);
    const timestamp = new Date().toISOString();
    const value = {
      id: "record-1",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      namespace: "roundtrip_test",
    };

    const saved = await storage.save(value);
    const result = await storage.get("record-1");

    expect(saved).toEqual(value);
    expect(result).toEqual(value);
  });

  it("recovers encrypted storage with a new production crypto pipeline instance", async () => {
    const firstPipeline = await createCryptoPipeline();
    const firstStorage = await createStorageService("persistent_pipeline_test", firstPipeline);
    const timestamp = new Date().toISOString();
    const value = {
      id: "persistent-record-1",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      namespace: "persistent_pipeline_test",
    };

    await firstStorage.save(value);

    const secondPipeline = await createCryptoPipeline();
    const secondStorage = await createStorageService("persistent_pipeline_test", secondPipeline);

    expect(await secondStorage.get("persistent-record-1")).toEqual(value);
  });
});
