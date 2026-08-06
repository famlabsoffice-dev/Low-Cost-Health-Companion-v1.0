import { z } from "zod";
import { versionedRecordSchema } from "./storageSchemas";

export const documentSchema = z.object({
  documentId: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
});

export const versionedDocumentSchema = versionedRecordSchema(documentSchema);
