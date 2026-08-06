import { z } from "zod";

export const healthRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  type: z.string().min(1),
  payload: z.record(z.unknown()),
});

export type HealthRecord = z.infer<typeof healthRecordSchema>;
