import type { HealthRecord } from "../domain/healthRecord";

export interface HealthInput {
  id: string;
  type: string;
  value: unknown;
  occurredAt?: number;
}

export function createHealthRecord(input: HealthInput, now = Date.now()): HealthRecord {
  const timestamp = input.occurredAt ?? now;
  if (!input.id.trim()) throw new Error("Health input id is required");
  if (!input.type.trim()) throw new Error("Health input type is required");
  if (!Number.isFinite(timestamp)) throw new Error("Health input timestamp must be finite");

  return {
    id: input.id,
    type: input.type,
    value: input.value,
    createdAt: timestamp,
    updatedAt: now,
  };
}
