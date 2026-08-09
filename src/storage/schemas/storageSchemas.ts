import { z } from "zod";

export const versionedStorageSchema = z
  .object({
    id: z.string().min(1),
    schemaVersion: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .passthrough();

export interface StorageSchema<T> {
  safeParse(input: unknown): { success: boolean; data?: T };
}

export function validateStorageInput<T>(schema: StorageSchema<T>, input: unknown) {
  return schema.safeParse(input);
}
