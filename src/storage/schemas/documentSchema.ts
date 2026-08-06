import { z } from "zod";
import { versionedStorageSchema } from "./storageSchemas";

export const documentSchema = versionedStorageSchema.extend({
  type: z.literal("document"),
  filename: z.string().min(1),
});
