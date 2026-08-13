import type { HealthRecord } from "../domain/healthRecord";

export interface HealthInput {
  id: string;
  type: string;
  value: unknown;
  occurredAt?: number;
}

export function createHealthRecord(input: HealthInput, now = Date.now()): HealthRecord {
  const id = input.id.trim();
  const type = input.type.trim();

  if (!id) throw new Error("Health input id is required");
  if (!type) throw new Error("Health input type is required");
  if (!Number.isFinite(now)) throw new Error("Health input current timestamp must be finite");

  const timestamp = input.occurredAt ?? now;
  if (!Number.isFinite(timestamp)) throw new Error("Health input timestamp must be finite");

  return {
    id,
    type,
    value: input.value,
    createdAt: timestamp,
    updatedAt: now,
  };
}
