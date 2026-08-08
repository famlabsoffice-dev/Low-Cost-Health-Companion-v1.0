import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from "vitest";
import { createStorageService } from "../../src/storage/repository/storageServiceFactory";

describe("storage service encrypted roundtrip", () => {
  beforeEach(() => {
    indexedDB.deleteDatabase("low-cost-health-companion");
  });

  it("encrypts, stores, reads and decrypts a value", async () => {
    const storage = await createStorageService("roundtrip_test");
    const timestamp = new Date().toISOString();
    const value = {
      id: "record-1",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const saved = await storage.save(value);
    const result = await storage.get("record-1");

    expect(saved).toMatchObject({
      ...value,
      namespace: "roundtrip_test",
    });
    expect(result).toMatchObject({
      ...value,
      namespace: "roundtrip_test",
    });
  });
});
