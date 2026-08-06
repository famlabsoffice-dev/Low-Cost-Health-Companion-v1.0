import type { Conflict, ConflictResolution, SyncRecord } from './syncTypes';

export function resolveConflict<T>(conflict: Conflict<T>, strategy: ConflictResolution): SyncRecord<T> {
  if (strategy === 'remote') return conflict.remote;
  if (strategy === 'local') return conflict.local;

  return {
    ...conflict.local,
    payload: { ...conflict.remote.payload, ...conflict.local.payload } as T,
    version: Math.max(conflict.local.version, conflict.remote.version) + 1,
    timestamp: Date.now(),
  };
}
