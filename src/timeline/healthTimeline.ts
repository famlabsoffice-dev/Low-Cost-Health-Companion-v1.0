import type { HealthRecord } from "../domain/healthRecord";

export interface HealthTimelineEntry extends HealthRecord {
  occurredAt: number;
}

export interface HealthTimelineQuery {
  type?: string;
  from?: number;
  to?: number;
  offset?: number;
  limit?: number;
  cursor?: string;
}

export interface HealthTimelinePage {
  entries: HealthTimelineEntry[];
  nextCursor?: string;
}

interface HealthTimelineCursor {
  occurredAt: number;
  id: string;
}

const CURSOR_PREFIX = "v1";

export function toTimelineEntry(record: HealthRecord): HealthTimelineEntry {
  return { ...record, occurredAt: record.createdAt };
}

export function sortHealthTimeline(
  records: readonly HealthRecord[],
): HealthTimelineEntry[] {
  return records
    .map(toTimelineEntry)
    .sort(
      (a, b) =>
        b.occurredAt - a.occurredAt ||
        a.id.localeCompare(b.id),
    );
}

export function encodeHealthTimelineCursor(entry: HealthTimelineEntry): string {
  return `${CURSOR_PREFIX}:${entry.occurredAt}:${encodeURIComponent(entry.id)}`;
}

function decodeHealthTimelineCursor(cursor: string): HealthTimelineCursor {
  const parts = cursor.split(":");
  if (parts.length < 3 || parts[0] !== CURSOR_PREFIX) {
    throw new Error("Health timeline cursor is invalid");
  }

  const occurredAt = Number(parts[1]);
  if (!Number.isFinite(occurredAt)) {
    throw new Error("Health timeline cursor timestamp must be finite");
  }

  let id: string;
  try {
    id = decodeURIComponent(parts.slice(2).join(":"));
  } catch {
    throw new Error("Health timeline cursor is invalid");
  }

  if (!id) {
    throw new Error("Health timeline cursor id is required");
  }

  return { occurredAt, id };
}

function validateHealthTimelineQuery(query: HealthTimelineQuery): void {
  if (query.type !== undefined && !query.type.trim()) {
    throw new Error("Health timeline type must not be empty");
  }

  if (query.from !== undefined && !Number.isFinite(query.from)) {
    throw new Error("Health timeline from must be finite");
  }

  if (query.to !== undefined && !Number.isFinite(query.to)) {
    throw new Error("Health timeline to must be finite");
  }

  if (
    query.from !== undefined &&
    query.to !== undefined &&
    query.from > query.to
  ) {
    throw new Error("Health timeline from must not exceed to");
  }

  if (
    query.offset !== undefined &&
    (!Number.isInteger(query.offset) || query.offset < 0)
  ) {
    throw new Error(
      "Health timeline offset must be a non-negative integer",
    );
  }

  if (
    query.limit !== undefined &&
    (!Number.isInteger(query.limit) || query.limit < 1)
  ) {
    throw new Error(
      "Health timeline limit must be a positive integer",
    );
  }

  if (query.cursor !== undefined && query.offset !== undefined) {
    throw new Error("Health timeline cursor cannot be combined with offset");
  }

  if (query.cursor !== undefined) {
    decodeHealthTimelineCursor(query.cursor);
  }
}

function applyTimelineQuery(
  records: readonly HealthRecord[],
  query: HealthTimelineQuery,
): HealthTimelineEntry[] {
  validateHealthTimelineQuery(query);

  const filtered = records.filter((record) => {
    const occurredAt = record.createdAt;

    return (
      (query.type === undefined || record.type === query.type) &&
      (query.from === undefined || occurredAt >= query.from) &&
      (query.to === undefined || occurredAt <= query.to)
    );
  });

  const sorted = sortHealthTimeline(filtered);

  if (query.cursor === undefined) {
    return sorted;
  }

  const cursor = decodeHealthTimelineCursor(query.cursor);
  return sorted.filter(
    (entry) =>
      entry.occurredAt < cursor.occurredAt ||
      (entry.occurredAt === cursor.occurredAt &&
        entry.id.localeCompare(cursor.id) > 0),
  );
}

export function queryHealthTimeline(
  records: readonly HealthRecord[],
  query: HealthTimelineQuery = {},
): HealthTimelineEntry[] {
  const sorted = applyTimelineQuery(records, query);
  const offset = query.offset ?? 0;

  return query.limit === undefined
    ? sorted.slice(offset)
    : sorted.slice(offset, offset + query.limit);
}

export function queryHealthTimelinePage(
  records: readonly HealthRecord[],
  query: HealthTimelineQuery = {},
): HealthTimelinePage {
  const sorted = applyTimelineQuery(records, query);
  const offset = query.offset ?? 0;
  const entries =
    query.limit === undefined
      ? sorted.slice(offset)
      : sorted.slice(offset, offset + query.limit);
  const end = offset + entries.length;
  const hasMore = query.limit !== undefined && end < sorted.length;

  return {
    entries,
    ...(hasMore && entries.length > 0
      ? { nextCursor: encodeHealthTimelineCursor(entries[entries.length - 1]) }
      : {}),
  };
}
