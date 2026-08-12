import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedDbSyncQueue } from '../src/sync/indexedDbSyncQueue';
import { OfflineSyncCoordinator } from '../src/sync/offlineSyncCoordinator';
import { OfflineSyncEngine } from '../src/sync/syncEngine';
import type { SyncRecord, SyncTransport } from '../src/sync/syncTypes';

const databaseName = 'offline-sync-persistence-integration';

const record: SyncRecord<{ value: string }> = {
  id: 'persistent-record-1',
  entity: 'health-record',
  operation: 'update',
  payload: { value: 'offline' },
  version: 1,
  timestamp: Date.now(),
  retries: 0,
};

describe('offline sync persistence integration', () => {
  let online = false;
  let listeners = new Set<() => void>();

  beforeEach(() => {
    online = false;
    listeners = new Set();
    vi.stubGlobal('navigator', { get onLine() { return online; } });
    vi.stubGlobal('window', {
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists an offline record and flushes it after reconnect', async () => {
    const queue = new IndexedDbSyncQueue<typeof record.payload>(databaseName);
    const transport: SyncTransport<typeof record.payload> = {
      push: vi.fn(async (records) => ({
        applied: records.map(({ id }) => id),
        rejected: [],
        conflicts: [],
      })),
    };
    const engine = new OfflineSyncEngine(queue, transport);
    const coordinator = new OfflineSyncCoordinator(engine);

    coordinator.start();
    await coordinator.enqueue(record);

    const reopenedQueue = new IndexedDbSyncQueue<typeof record.payload>(databaseName);
    expect(await reopenedQueue.pending()).toEqual([record]);
    expect(transport.push).not.toHaveBeenCalled();

    online = true;
    for (const listener of listeners) listener();
    await vi.waitFor(() => expect(transport.push).toHaveBeenCalledTimes(1));
    await vi.waitFor(async () => expect(await reopenedQueue.pending()).toEqual([]));

    coordinator.stop();
  });
});
