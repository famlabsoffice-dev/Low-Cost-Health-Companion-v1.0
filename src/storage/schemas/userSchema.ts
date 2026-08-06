import { z } from "zod";
import { versionedStorageSchema } from "./storageSchemas";

export const userSchema = versionedStorageSchema.extend({
  type: z.literal("user"),
  name: z.string().min(1),
});
