import type { HealthTimelineEntry } from "./healthTimeline";

export interface HealthTimelinePresentationEntry {
  id: string;
  type: string;
  occurredAt: number;
  dateLabel: string;
  timeLabel: string;
  valueLabel: string;
  ariaLabel: string;
}

export interface HealthTimelineGroup {
  dateKey: string;
  dateLabel: string;
  entries: HealthTimelinePresentationEntry[];
}

const MAX_VALUE_LABEL_LENGTH = 160;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function assertValidTimestamp(timestamp: number): void {
  if (!Number.isFinite(timestamp)) {
    throw new Error("Health timeline timestamp must be finite");
  }

  if (!Number.isFinite(new Date(timestamp).getTime())) {
    throw new Error("Health timeline timestamp is invalid");
  }
}

export function formatHealthTimelineValue(value: unknown): string {
  let label: string;

  if (value === null) {
    label = "No value";
  } else if (typeof value === "string") {
    label = value.trim() || "Empty value";
  } else if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    label = String(value);
  } else {
    try {
      label = JSON.stringify(value) ?? "No value";
    } catch {
      label = "Value unavailable";
    }
  }

  if (label.length <= MAX_VALUE_LABEL_LENGTH) {
    return label;
  }

  return `${label.slice(0, MAX_VALUE_LABEL_LENGTH - 1)}…`;
}

export function toHealthTimelinePresentationEntry(
  entry: HealthTimelineEntry,
): HealthTimelinePresentationEntry {
  assertValidTimestamp(entry.occurredAt);

  const date = new Date(entry.occurredAt);
  const dateKey = date.toISOString().slice(0, 10);
  const dateLabel = dateFormatter.format(date);
  const timeLabel = timeFormatter.format(date);
  const valueLabel = formatHealthTimelineValue(entry.value);

  return {
    id: entry.id,
    type: entry.type,
    occurredAt: entry.occurredAt,
    dateLabel,
    timeLabel,
    valueLabel,
    ariaLabel: `${entry.type}, ${dateLabel}, ${timeLabel}, ${valueLabel}`,
  };
}

export function groupHealthTimelineForPresentation(
  entries: readonly HealthTimelineEntry[],
): HealthTimelineGroup[] {
  const groups = new Map<string, HealthTimelineGroup>();

  for (const entry of entries) {
    const presentationEntry = toHealthTimelinePresentationEntry(entry);
    const dateKey = new Date(entry.occurredAt).toISOString().slice(0, 10);
    let group = groups.get(dateKey);

    if (!group) {
      group = {
        dateKey,
        dateLabel: presentationEntry.dateLabel,
        entries: [],
      };
      groups.set(dateKey, group);
    }

    group.entries.push(presentationEntry);
  }

  return [...groups.values()];
}
