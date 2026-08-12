import { describe, expect, it } from "vitest";
import { sortHealthTimeline } from "../../src/timeline/healthTimeline";
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
      "same-time-a",
      "same-time-b",
      "newer",
      "older",
    ]);
  });
});
