import { z } from "zod";

export const migratedHealthRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  type: z.string().min(1),
  payload: z.record(z.unknown()),
});

export type MigratedHealthRecord = z.infer<typeof migratedHealthRecordSchema>;
