import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfflineSyncEngine, SyncResult } from '../src/sync/syncEngine';
import type { SyncRecord } from '../src/sync/syncTypes';
import { OfflineSyncCoordinator } from '../src/sync/offlineSyncCoordinator';

const record: SyncRecord<{ value: string }> = {
  id: 'record-1',
  entity: 'health-record',
  operation: 'update',
  payload: { value: 'offline' },
  version: 1,
  timestamp: Date.now(),
  retries: 0,
};

interface TestWindow {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  dispatchEvent: (event: Event) => void;
}

describe('OfflineSyncCoordinator', () => {
  let online = true;
  let listeners = new Set<() => void>();

  beforeEach(() => {
    online = true;
    listeners = new Set();
    vi.stubGlobal('navigator', { get onLine() { return online; } });
    vi.stubGlobal('window', {
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      dispatchEvent: () => {
        for (const listener of listeners) listener();
        return true;
      },
    } satisfies TestWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flushes immediately when an item is enqueued online', async () => {
    const flush = vi.fn<() => Promise<SyncResult>>().mockResolvedValue({ pushed: 1, conflicts: 0, failed: 0 });
    const enqueue = vi.fn<OfflineSyncEngine<typeof record.payload>['enqueue']>().mockResolvedValue();
    const engine = { enqueue, flush } as unknown as OfflineSyncEngine<typeof record.payload>;
    const onSync = vi.fn();
    const coordinator = new OfflineSyncCoordinator(engine, { onSync });

    await coordinator.enqueue(record);

    expect(enqueue).toHaveBeenCalledWith(record);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({ pushed: 1, conflicts: 0, failed: 0 });
  });

  it('does not flush while offline and flushes when connectivity returns', async () => {
    online = false;
    const flush = vi.fn<() => Promise<SyncResult>>().mockResolvedValue({ pushed: 1, conflicts: 0, failed: 0 });
    const enqueue = vi.fn<OfflineSyncEngine<typeof record.payload>['enqueue']>().mockResolvedValue();
    const engine = { enqueue, flush } as unknown as OfflineSyncEngine<typeof record.payload>;
    const coordinator = new OfflineSyncCoordinator(engine);

    coordinator.start();
    await coordinator.enqueue(record);
    expect(flush).not.toHaveBeenCalled();

    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(flush).toHaveBeenCalledTimes(1));

    coordinator.stop();
  });

  it('prevents concurrent flushes', async () => {
    let resolveFlush!: (result: SyncResult) => void;
    const flushPromise = new Promise<SyncResult>((resolve) => { resolveFlush = resolve; });
    const flush = vi.fn<() => Promise<SyncResult>>().mockReturnValue(flushPromise);
    const enqueue = vi.fn<OfflineSyncEngine<typeof record.payload>['enqueue']>().mockResolvedValue();
    const engine = { enqueue, flush } as unknown as OfflineSyncEngine<typeof record.payload>;
    const coordinator = new OfflineSyncCoordinator(engine);

    const first = coordinator.flush();
    const second = coordinator.flush();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(await second).toEqual({ pushed: 0, conflicts: 0, failed: 0 });

    resolveFlush({ pushed: 1, conflicts: 0, failed: 0 });
    await expect(first).resolves.toEqual({ pushed: 1, conflicts: 0, failed: 0 });
  });
});
