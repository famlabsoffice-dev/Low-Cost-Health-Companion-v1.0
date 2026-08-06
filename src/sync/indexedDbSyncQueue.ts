import type { SyncRecord } from './syncTypes';

export class IndexedDbSyncQueue {
  private queue = new Map<string, SyncRecord>();

  async enqueue(record: SyncRecord): Promise<void> {
    this.queue.set(record.id, record);
  }

  async pending(): Promise<SyncRecord[]> {
    return [...this.queue.values()].sort((a, b) => a.timestamp - b.timestamp);
  }

  async remove(id: string): Promise<void> {
    this.queue.delete(id);
  }

  async clear(): Promise<void> {
    this.queue.clear();
  }
}
