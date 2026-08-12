import { describe, expect, it } from "vitest";
import { sortHealthTimeline } from "../../src/timeline/healthTimeline";
import { createHealthRecord } from "../../src/input/healthInput";
import type { HealthRecord } from "../../src/domain/healthRecord";

describe("health timeline", () => {
  it("sorts entries newest first and preserves deterministic ordering", () => {
    const records: HealthRecord[] = [
      { id: "older", type: "vital", value: 100, createdAt: 100, updatedAt: 120 },
      { id: "newer", type: "vital", value: 120, createdAt: 200, updatedAt: 220 },
      { id: "same-time-b", type: "note", value: "b", createdAt: 200, updatedAt: 220 },
      { id: "same-time-a", type: "note", value: "a", createdAt: 200, updatedAt: 220 },
    ];

    expect(sortHealthTimeline(records).map((entry) => entry.id)).toEqual([
      "newer",
      "same-time-a",
      "same-time-b",
      "older",
    ]);
  });

  it("normalizes timestamped input into a health record", () => {
    expect(createHealthRecord({ id: "record-1", type: "vital", value: 120, occurredAt: 100 }, 200)).toEqual({
      id: "record-1",
      type: "vital",
      value: 120,
      createdAt: 100,
      updatedAt: 200,
    });
  });

  it("rejects missing identity and type", () => {
    expect(() => createHealthRecord({ id: "", type: "vital", value: 1 }, 200)).toThrow("Health input id is required");
    expect(() => createHealthRecord({ id: "record-1", type: "", value: 1 }, 200)).toThrow("Health input type is required");
  });
});
