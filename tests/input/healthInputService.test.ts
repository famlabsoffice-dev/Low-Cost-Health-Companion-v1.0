import { describe, expect, it, vi } from "vitest";
import type { HealthRecord } from "../../src/domain/healthRecord";
import type { HealthTimelineRepository } from "../../src/timeline/healthTimelineRepository";
import { HealthInputService } from "../../src/input/healthInputService";

describe("health input service", () => {
  it("normalizes input and persists the resulting health record", async () => {
    const saved: HealthRecord[] = [];
    const timeline = {
      save: vi.fn(async (record: HealthRecord) => {
        saved.push(record);
      }),
    } as unknown as HealthTimelineRepository;
    const service = new HealthInputService(timeline);

    const result = await service.ingest(
      { id: "heart-rate-1", type: "heart-rate", value: 72, occurredAt: 1_700_000_000_000 },
      1_700_000_001_000,
    );

    expect(result).toEqual({
      id: "heart-rate-1",
      type: "heart-rate",
      value: 72,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_001_000,
    });
    expect(saved).toEqual([result]);
    expect(timeline.save).toHaveBeenCalledWith(result);
  });

  it("does not persist invalid input", async () => {
    const timeline = { save: vi.fn() } as unknown as HealthTimelineRepository;
    const service = new HealthInputService(timeline);

    await expect(service.ingest({ id: "", type: "vital", value: 1 }, 100)).rejects.toThrow(
      "Health input id is required",
    );
    expect(timeline.save).not.toHaveBeenCalled();
  });
});
