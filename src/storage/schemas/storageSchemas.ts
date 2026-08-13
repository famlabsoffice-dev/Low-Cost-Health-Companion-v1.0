import { z } from "zod";

export type StorageSchema<T> = z.ZodType<T>;

export const versionedStorageSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export function validateStorageInput<T>(schema: StorageSchema<T>, input: unknown) {
  return schema.safeParse(input);
}
