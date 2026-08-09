import type { SyncQueue, SyncRecord, SyncTransport, ConflictResolution } from './syncTypes';
import { resolveConflict } from './conflictResolution';

export interface SyncResult {
  pushed: number;
  conflicts: number;
  failed: number;
}

export class OfflineSyncEngine<T = unknown> {
  constructor(
    private readonly queue: SyncQueue<T>,
    private readonly transport: SyncTransport<T>,
    private readonly conflictStrategy: ConflictResolution = 'merge',
    private readonly maxRetries = 5,
  ) {
    if (!Number.isSafeInteger(maxRetries) || maxRetries < 1) throw new Error(`Invalid sync retry limit: ${maxRetries}`);
  }

  enqueue(record: SyncRecord<T>): Promise<void> {
    return this.queue.enqueue(record);
  }

  pending(): Promise<SyncRecord<T>[]> {
    return this.queue.pending();
  }

  async flush(): Promise<SyncResult> {
    const pending = await this.queue.pending();
    if (pending.length === 0) return { pushed: 0, conflicts: 0, failed: 0 };

    const result = await this.transport.push(pending);
    const applied = new Set(result.applied);
    let pushed = 0;
    let failed = 0;

    for (const record of pending) {
      if (applied.has(record.id)) {
        await this.queue.remove(record.id);
        pushed += 1;
        continue;
      }

      const conflict = result.conflicts.find((item) => item.local.id === record.id);
      if (conflict) {
        const resolved = resolveConflict(conflict, this.conflictStrategy);
        await this.queue.replace(resolved);
        continue;
      }

      if (result.rejected.includes(record.id)) {
        const retries = record.retries + 1;
        if (retries >= this.maxRetries) {
          failed += 1;
          continue;
        }
        await this.queue.replace({ ...record, retries });
        failed += 1;
      }
    }

    return { pushed, conflicts: result.conflicts.length, failed };
  }
}
