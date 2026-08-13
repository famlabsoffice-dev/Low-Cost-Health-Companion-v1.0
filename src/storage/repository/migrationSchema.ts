import { z } from "zod";

export interface MigratedHealthRecord {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  payload: Record<string, unknown>;
}

export const migratedHealthRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  type: z.string().min(1),
  payload: z.record(z.unknown()),
});
