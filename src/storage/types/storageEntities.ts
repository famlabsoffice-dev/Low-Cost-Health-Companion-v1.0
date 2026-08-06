export type StorageEntityType =
  | "user"
  | "story"
  | "document"
  | "health_entry"
  | "media";

export interface StorageEntityMetadata {
  entityType: StorageEntityType;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface VersionedRecord<T> {
  id: string;
  version: number;
  metadata: StorageEntityMetadata;
  payload: T;
}

export interface StorageOperationResult {
  success: boolean;
  id?: string;
  error?: string;
}
