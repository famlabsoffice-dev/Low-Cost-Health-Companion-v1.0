import { describe, expect, it, vi } from "vitest";
import type { HealthRecord } from "../../src/domain/healthRecord";
import type { HealthRecordRepository } from "../../src/domain/healthRecordRepository";
import { HealthTimelineRepository } from "../../src/timeline/healthTimelineRepository";

function record(id: string, createdAt: number): HealthRecord {
  return { id, type: "vital", value: createdAt, createdAt, updatedAt: createdAt };
}

describe("health timeline repository", () => {
  it("persists through the domain repository and returns chronological entries", async () => {
    const records = [record("older", 100), record("newer", 300), record("same-time", 200)];
    const domainRepository = {
      save: vi.fn(),
      get: vi.fn(),
      list: vi.fn().mockResolvedValue(records),
      delete: vi.fn(),
    } as unknown as HealthRecordRepository;
    const repository = new HealthTimelineRepository(domainRepository);

    await repository.save(records[0]);
    expect(domainRepository.save).toHaveBeenCalledWith(records[0]);

    expect(await repository.get("newer")).toBeUndefined();
    expect(domainRepository.get).toHaveBeenCalledWith("newer");

    expect(await repository.list()).toEqual([
      { ...records[1], occurredAt: 300 },
      { ...records[2], occurredAt: 200 },
      { ...records[0], occurredAt: 100 },
    ]);
  });

  it("delegates removal to the domain repository", async () => {
    const domainRepository = { delete: vi.fn().mockResolvedValue(undefined) } as unknown as HealthRecordRepository;
    const repository = new HealthTimelineRepository(domainRepository);

    await repository.remove("record-1");

    expect(domainRepository.delete).toHaveBeenCalledWith("record-1");
  });
});
