import { describe, expect, it } from 'vitest';
import { IndexedDbSyncQueue } from '../../src/sync/indexedDbSyncQueue';
import { resolveConflict } from '../../src/sync/conflictResolution';

describe('Offline Sync Engine', () => {
  it('queues offline changes', async () => {
    const queue = new IndexedDbSyncQueue();
    await queue.enqueue({ id: '1', entity: 'health', operation: 'update', payload: { a: 1 }, version: 1, timestamp: 1, retries: 0 });
    expect((await queue.pending()).length).toBe(1);
  });

  it('resolves local conflicts', () => {
    const result = resolveConflict({ local: { id: '1', entity: 'x', operation: 'update', payload: { value: 2 }, version: 2, timestamp: 2, retries: 0 }, remote: { id: '1', entity: 'x', operation: 'update', payload: { value: 1 }, version: 1, timestamp: 1, retries: 0 } }, 'local');
    expect(result.version).toBe(2);
  });
});
