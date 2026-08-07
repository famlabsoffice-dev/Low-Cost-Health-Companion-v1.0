import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { createStorageService } from "../../src/storage/repository/storageServiceFactory";

describe("storage service encrypted roundtrip", () => {
  beforeEach(() => {
    indexedDB.deleteDatabase("health_companion");
  });

  it("encrypts, stores, reads and decrypts a value", async () => {
    const storage = await createStorageService("roundtrip_test");
    const id = await storage.save({
      id: "record-1",
      value: "encrypted-health-data",
    });

    const result = await storage.get(String(id));

    expect(result).toMatchObject({
      id: "record-1",
      value: "encrypted-health-data",
      namespace: "roundtrip_test",
    });
  });
});
