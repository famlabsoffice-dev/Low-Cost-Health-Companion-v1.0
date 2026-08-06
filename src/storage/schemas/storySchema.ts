import { z } from "zod";
import { versionedRecordSchema } from "./storageSchemas";

export const storySchema = z.object({
  storyId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().default(""),
});

export const versionedStorySchema = versionedRecordSchema(storySchema);
