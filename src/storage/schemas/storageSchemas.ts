export interface StorageSchema<T> {
  safeParse(input: unknown): { success: boolean; data?: T };
}

function isFinitePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export const versionedStorageSchema: StorageSchema<{
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}> = {
  safeParse(input: unknown) {
    if (typeof input !== "object" || input === null) return { success: false };
    const value = input as Record<string, unknown>;
    if (typeof value.id !== "string" || !value.id.trim()) return { success: false };
    if (!isFinitePositiveInteger(value.schemaVersion)) return { success: false };
    if (!isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt)) return { success: false };
    return {
      success: true,
      data: {
        id: value.id,
        schemaVersion: value.schemaVersion,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      },
    };
  },
};

export function validateStorageInput<T>(schema: StorageSchema<T>, input: unknown) {
  return schema.safeParse(input);
}
