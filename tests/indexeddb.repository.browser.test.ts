import "fake-indexeddb/auto";

import { IndexedDbStorageRepository } from "../src/storage/repository/storageRepository";

type TestRecord = {
  id: string;
  value: string;
};

const schema = {
  safeParse(value: unknown) {
    const record = value as Partial<TestRecord>;

    if (typeof record.id === "string" && typeof record.value === "string") {
      return { success: true, data: record as TestRecord };
    }

    return { success: false };
  },
};

describe("IndexedDB storage repository browser runtime", () => {
  it("persists and retrieves validated records", async () => {
    const repository = new IndexedDbStorageRepository<TestRecord>(schema);

    await repository.save({ id: "browser-test", value: "indexeddb-runtime" });

    await expect(repository.get("browser-test")).resolves.toEqual({
      id: "browser-test",
      value: "indexeddb-runtime",
    });

    await repository.remove("browser-test");
    await expect(repository.get("browser-test")).resolves.toBeNull();
  });
});
