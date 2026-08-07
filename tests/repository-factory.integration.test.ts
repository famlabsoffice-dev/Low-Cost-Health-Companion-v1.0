import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createHealthRecordRepository } from "../src/domain/repositoryFactory";
import { HealthRecordRepository } from "../src/domain/healthRecordRepository";

describe("repository factory pipeline integration", () => {
  it("creates encrypted repository pipeline through factory", async () => {
    const repository = await createHealthRecordRepository();

    expect(repository).toBeInstanceOf(HealthRecordRepository);
  });
});
