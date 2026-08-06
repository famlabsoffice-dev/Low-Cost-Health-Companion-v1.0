import { z } from "zod";

export const versionedMetadataSchema = z.object({
  entityType: z.string(),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const versionedRecordSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
    metadata: versionedMetadataSchema,
    payload: payloadSchema,
  });

export function validateStorageInput<T>(schema: z.ZodSchema<T>, input: unknown) {
  return schema.safeParse(input);
}
