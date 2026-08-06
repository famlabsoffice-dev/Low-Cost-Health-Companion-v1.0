import { z } from "zod";
import { versionedRecordSchema } from "./storageSchemas";

export const healthEntrySchema = z.object({
  entryId: z.string().min(1),
  category: z.string().min(1),
  value: z.string().min(1),
  recordedAt: z.string().datetime(),
});

export const versionedHealthEntrySchema = versionedRecordSchema(healthEntrySchema);
