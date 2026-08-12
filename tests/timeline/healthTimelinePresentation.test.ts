import { describe, expect, it } from "vitest";
import type { HealthTimelineEntry } from "../../src/timeline/healthTimeline";
import {
  formatHealthTimelineValue,
  groupHealthTimelineForPresentation,
  toHealthTimelinePresentationEntry,
} from "../../src/timeline/healthTimelinePresentation";

const entries: HealthTimelineEntry[] = [
  { id: "newer", type: "vital", value: 120, occurredAt: 1_754_060_400_000, createdAt: 1_754_060_400_000, updatedAt: 1_754_060_400_000 },
  { id: "same-day", type: "note", value: "Feeling good", occurredAt: 1_754_060_100_000, createdAt: 1_754_060_100_000, updatedAt: 1_754_060_100_000 },
  { id: "next-day", type: "vital", value: { systolic: 120, diastolic: 80 }, occurredAt: 1_754_146_800_000, createdAt: 1_754_146_800_000, updatedAt: 1_754_146_800_000 },
];

describe("health timeline presentation", () => {
  it("creates stable, accessible labels without exposing object formatting", () => {
    const result = toHealthTimelinePresentationEntry(entries[0]);

    expect(result.dateLabel).toBe("01 Aug 2025");
    expect(result.timeLabel).toBe("15:00:00");
    expect(result.valueLabel).toBe("120");
    expect(result.ariaLabel).toBe("vital, 01 Aug 2025, 15:00:00, 120");
  });

  it("formats structured values deterministically and truncates long labels", () => {
    expect(formatHealthTimelineValue({ systolic: 120, diastolic: 80 })).toBe(
      '{"systolic":120,"diastolic":80}',
    );
    expect(formatHealthTimelineValue(null)).toBe("No value");
    expect(formatHealthTimelineValue(" ")).toBe("Empty value");
    expect(formatHealthTimelineValue("x".repeat(200))).toHaveLength(160);
    expect(formatHealthTimelineValue("x".repeat(200)).endsWith("…")).toBe(true);
  });

  it("groups entries by UTC calendar day while preserving input order", () => {
    const groups = groupHealthTimelineForPresentation(entries);

    expect(groups.map((group) => group.dateKey)).toEqual(["2025-08-01", "2025-08-02"]);
    expect(groups[0].entries.map((entry) => entry.id)).toEqual(["newer", "same-day"]);
    expect(groups[1].entries.map((entry) => entry.id)).toEqual(["next-day"]);
  });

  it("rejects invalid timestamps before presentation", () => {
    expect(() =>
      toHealthTimelinePresentationEntry({
        ...entries[0],
        occurredAt: Number.NaN,
      }),
    ).toThrow("Health timeline timestamp must be finite");
  });
});
