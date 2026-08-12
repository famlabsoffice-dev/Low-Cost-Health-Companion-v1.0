import type { HealthRecord } from "../domain/healthRecord";

export interface HealthTimelineEntry extends HealthRecord {
  occurredAt: number;
}

export function toTimelineEntry(record: HealthRecord): HealthTimelineEntry {
  return { ...record, occurredAt: record.createdAt };
}

export function sortHealthTimeline(records: readonly HealthRecord[]): HealthTimelineEntry[] {
  return records
    .map(toTimelineEntry)
    .sort((a, b) => b.occurredAt - a.occurredAt || b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
