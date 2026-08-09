import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDbSyncQueue } from '../../src/sync/indexedDbSyncQueue';
import { OfflineSyncEngine } from '../../src/sync/syncEngine';
import { resolveConflict } from '../../src/sync/conflictResolution';
import type { SyncRecord, SyncTransport } from '../../src/sync/syncTypes';

function record(id: string, timestamp: number, version = 1): SyncRecord {
  return { id, entity: 'health', operation: 'update', payload: { value: timestamp }, version, timestamp, retries: 0 };
}

describe('Offline Sync Engine', () => {
  it('persists queued changes across queue instances and preserves order', async () => {
    const database = `sync-test-${crypto.randomUUID()}`;
    const first = new IndexedDbSyncQueue(database);
    await first.enqueue(record('second', 2));
    await first.enqueue(record('first', 1));

    const restarted = new IndexedDbSyncQueue(database);
    expect(await restarted.pending()).toEqual([record('first', 1), record('second', 2)]);
  });

  it('flushes applied changes and retains retryable failures', async () => {
    const queue = new IndexedDbSyncQueue(`sync-test-${crypto.randomUUID()}`);
    await queue.enqueue(record('ok', 1));
    await queue.enqueue(record('retry', 2));
    const transport: SyncTransport = {
      async push(records) {
        expect(records.map((item) => item.id)).toEqual(['ok', 'retry']);
        return { applied: ['ok'], rejected: ['retry'], conflicts: [] };
      },
    };
    const engine = new OfflineSyncEngine(queue, transport, 'merge', 3);

    expect(await engine.flush()).toEqual({ pushed: 1, conflicts: 0, failed: 1 });
    expect(await queue.pending()).toEqual([{ ...record('retry', 2), retries: 1 }]);
  });

  it('resolves object conflicts deterministically', () => {
    const local = { ...record('conflict', 2, 2), payload: { systolic: 128 } };
    const remote = { ...record('conflict', 1, 1), payload: { diastolic: 82 } };
    const resolved = resolveConflict({ local, remote }, 'merge');

    expect(resolved.payload).toEqual({ diastolic: 82, systolic: 128 });
    expect(resolved.version).toBe(3);
    expect(resolved.retries).toBe(0);
  });
});
