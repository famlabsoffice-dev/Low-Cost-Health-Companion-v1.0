import type { StorageSchema } from "../schemas/storageSchemas";

export interface MigratedHealthRecord {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  payload: Record<string, unknown>;
}

export const migratedHealthRecordSchema: StorageSchema<MigratedHealthRecord> = {
  safeParse(input: unknown) {
    if (typeof input !== "object" || input === null) return { success: false };
    const value = input as Record<string, unknown>;
    if (typeof value.id !== "string" || !value.id.trim()) return { success: false };
    if (typeof value.schemaVersion !== "number" || !Number.isInteger(value.schemaVersion) || value.schemaVersion < 1) return { success: false };
    if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return { success: false };
    if (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return { success: false };
    if (typeof value.type !== "string" || !value.type.trim()) return { success: false };
    if (typeof value.payload !== "object" || value.payload === null || Array.isArray(value.payload)) return { success: false };
    return {
      success: true,
      data: {
        id: value.id,
        schemaVersion: value.schemaVersion,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        type: value.type,
        payload: value.payload as Record<string, unknown>,
      },
    };
  },
};
