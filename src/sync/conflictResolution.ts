import type { Conflict, ConflictResolution, SyncRecord } from './syncTypes';

export function resolveConflict<T>(conflict: Conflict<T>, strategy: ConflictResolution): SyncRecord<T> {
  if (strategy === 'local') return conflict.local;
  if (strategy === 'remote') return conflict.remote;

  if (!isRecord(conflict.local.payload) || !isRecord(conflict.remote.payload)) {
    throw new Error(`Cannot merge non-object sync payload: ${conflict.local.id}`);
  }

  return {
    ...conflict.local,
    payload: { ...conflict.remote.payload, ...conflict.local.payload } as T,
    version: Math.max(conflict.local.version, conflict.remote.version) + 1,
    timestamp: Date.now(),
    retries: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
