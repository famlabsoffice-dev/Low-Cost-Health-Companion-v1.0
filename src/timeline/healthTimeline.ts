import type { HealthRecord } from "../domain/healthRecord";

export interface HealthTimelineEntry extends HealthRecord {
  occurredAt: number;
}

export interface HealthTimelineQuery {
  type?: string;
  from?: number;
  to?: number;
  limit?: number;
}

export function toTimelineEntry(record: HealthRecord): HealthTimelineEntry {
  return { ...record, occurredAt: record.createdAt };
}

export function sortHealthTimeline(records: readonly HealthRecord[]): HealthTimelineEntry[] {
  return records
    .map(toTimelineEntry)
    .sort((a, b) => b.occurredAt - a.occurredAt || a.id.localeCompare(b.id));
}

export function queryHealthTimeline(
  records: readonly HealthRecord[],
  query: HealthTimelineQuery = {},
): HealthTimelineEntry[] {
  if (query.type !== undefined && !query.type.trim()) throw new Error("Health timeline type must not be empty");
  if (query.from !== undefined && !Number.isFinite(query.from)) throw new Error("Health timeline from must be finite");
  if (query.to !== undefined && !Number.isFinite(query.to)) throw new Error("Health timeline to must be finite");
  if (query.from !== undefined && query.to !== undefined && query.from > query.to) {
    throw new Error("Health timeline from must not exceed to");
  }
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1)) {
    throw new Error("Health timeline limit must be a positive integer");
  }

  const filtered = records.filter((record) => {
    const occurredAt = record.createdAt;
    return (
      (query.type === undefined || record.type === query.type) &&
      (query.from === undefined || occurredAt >= query.from) &&
      (query.to === undefined || occurredAt <= query.to)
    );
  });

  const sorted = sortHealthTimeline(filtered);
  return query.limit === undefined ? sorted : sorted.slice(0, query.limit);
}
