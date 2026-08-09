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

export interface SyncTransportResult<T = unknown> {
  applied: string[];
  rejected: string[];
  conflicts: Conflict<T>[];
}

export interface SyncTransport<T = unknown> {
  push(records: SyncRecord<T>[]): Promise<SyncTransportResult<T>>;
}

export interface SyncQueue<T = unknown> {
  enqueue(record: SyncRecord<T>): Promise<void>;
  pending(): Promise<SyncRecord<T>[]>;
  remove(id: string): Promise<void>;
  replace(record: SyncRecord<T>): Promise<void>;
  clear(): Promise<void>;
}
