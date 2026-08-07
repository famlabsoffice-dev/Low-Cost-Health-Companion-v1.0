import { describe, it, expect } from "vitest";
import { z } from "zod";
import { IndexedDbStorageRepository } from "../src/storage/repository/storageRepository";

type TestRecord = {
  id: string;
  value: string;
};

const schema = z.object({
  id: z.string(),
  value: z.string()
});

describe("IndexedDbStorageRepository", () => {
  it("stores and retrieves records", async () => {
    const repository =
      new IndexedDbStorageRepository<TestRecord>(schema);

    await repository.save({
      id: "test-record-1",
      value: "health-companion-test"
    });

    const result = await repository.get(
      "test-record-1"
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe("test-record-1");
    expect(result?.value).toBe(
      "health-companion-test"
    );
  });

  it("removes records", async () => {
    const repository =
      new IndexedDbStorageRepository<TestRecord>(schema);

    await repository.save({
      id: "delete-test-1",
      value: "temporary"
    });

    await repository.remove(
      "delete-test-1"
    );

    const result = await repository.get(
      "delete-test-1"
    );

    expect(result).toBeNull();
  });
});
