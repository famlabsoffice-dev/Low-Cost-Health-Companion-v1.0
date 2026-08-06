import { z } from "zod";
import { versionedStorageSchema } from "./storageSchemas";

export const healthEntrySchema = versionedStorageSchema.extend({
  type: z.literal("healthEntry"),
  metric: z.string().min(1),
  value: z.union([z.string(), z.number()]),
});
