import { z } from "zod";
import { versionedStorageSchema } from "./storageSchemas";

export const storySchema = versionedStorageSchema.extend({
  type: z.literal("story"),
  title: z.string().min(1),
});
