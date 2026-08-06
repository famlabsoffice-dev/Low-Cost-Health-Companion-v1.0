export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncRecord<T = unknown> {
  id: string;
  entity: string;
  operation: SyncOperation;
  payload: T;
  version: number;
  timestamp: number;
  retries: number;
}

export interface Conflict<T = unknown> {
  local: SyncRecord<T>;
  remote: SyncRecord<T>;
}

export type ConflictResolution = 'local' | 'remote' | 'merge';
