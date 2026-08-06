import { z } from "zod";
import { versionedRecordSchema } from "./storageSchemas";

export const userSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).optional(),
  locale: z.string().optional(),
});

export const versionedUserSchema = versionedRecordSchema(userSchema);
