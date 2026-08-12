import { describe, expect, it } from "vitest";
import { createHealthRecord } from "../../src/input/healthInput";
import type { HealthRecord } from "../../src/domain/healthRecord";
import {
  encodeHealthTimelineCursor,
  queryHealthTimeline,
  queryHealthTimelinePage,
  sortHealthTimeline,
} from "../../src/timeline/healthTimeline";

describe("health timeline", () => {
  const records: HealthRecord[] = [
    { id: "older", type: "vital", value: 100, createdAt: 100, updatedAt: 120 },
    { id: "newer", type: "vital", value: 120, createdAt: 200, updatedAt: 220 },
    { id: "same-time-b", type: "note", value: "b", createdAt: 200, updatedAt: 220 },
    { id: "same-time-a", type: "note", value: "a", createdAt: 200, updatedAt: 220 },
  ];

  it("sorts entries newest first and preserves deterministic ordering", () => {
    expect(sortHealthTimeline(records).map((entry) => entry.id)).toEqual([
      "newer",
      "same-time-a",
      "same-time-b",
      "older",
    ]);
  });

  it("filters by type and inclusive time range, then applies the limit", () => {
    expect(queryHealthTimeline(records, { type: "vital", from: 100, to: 200, limit: 1 }).map((entry) => entry.id)).toEqual(["newer"]);
    expect(queryHealthTimeline(records, { type: "note", from: 200, to: 200 }).map((entry) => entry.id)).toEqual([
      "same-time-a",
      "same-time-b",
    ]);
  });

  it("applies deterministic offset pagination after filtering and sorting", () => {
    expect(queryHealthTimeline(records, { offset: 1, limit: 2 }).map((entry) => entry.id)).toEqual([
      "same-time-a",
      "same-time-b",
    ]);
    expect(queryHealthTimeline(records, { offset: 2 }).map((entry) => entry.id)).toEqual([
      "same-time-b",
      "older",
    ]);
    expect(queryHealthTimeline(records, { offset: 20, limit: 2 })).toEqual([]);
  });

  it("returns a deterministic cursor and resumes after it", () => {
    const firstPage = queryHealthTimelinePage(records, { limit: 2 });
    expect(firstPage.entries.map((entry) => entry.id)).toEqual([
      "newer",
      "same-time-a",
    ]);
    expect(firstPage.nextCursor).toBe(
      encodeHealthTimelineCursor(firstPage.entries[1]),
    );

    const secondPage = queryHealthTimelinePage(records, {
      cursor: firstPage.nextCursor,
      limit: 2,
    });
    expect(secondPage.entries.map((entry) => entry.id)).toEqual([
      "same-time-b",
      "older",
    ]);
    expect(secondPage.nextCursor).toBeUndefined();
  });

  it("preserves filters across cursor pages", () => {
    const firstPage = queryHealthTimelinePage(records, { type: "note", limit: 1 });
    expect(firstPage.entries.map((entry) => entry.id)).toEqual(["same-time-a"]);

    const secondPage = queryHealthTimelinePage(records, {
      type: "note",
      cursor: firstPage.nextCursor,
      limit: 1,
    });
    expect(secondPage.entries.map((entry) => entry.id)).toEqual(["same-time-b"]);
  });

  it("rejects invalid timeline pagination cursors", () => {
    expect(() => queryHealthTimelinePage(records, { cursor: "invalid", limit: 1 })).toThrow(
      "Health timeline cursor is invalid",
    );
    expect(() => queryHealthTimelinePage(records, { cursor: "v1:200:id", offset: 1 })).toThrow(
      "Health timeline cursor cannot be combined with offset",
    );
  });

  it("rejects invalid timeline query bounds", () => {
    expect(() => queryHealthTimeline(records, { from: 300, to: 200 })).toThrow("Health timeline from must not exceed to");
    expect(() => queryHealthTimeline(records, { offset: -1 })).toThrow("Health timeline offset must be a non-negative integer");
    expect(() => queryHealthTimeline(records, { offset: 1.5 })).toThrow("Health timeline offset must be a non-negative integer");
    expect(() => queryHealthTimeline(records, { limit: 0 })).toThrow("Health timeline limit must be a positive integer");
    expect(() => queryHealthTimeline(records, { type: " " })).toThrow("Health timeline type must not be empty");
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
