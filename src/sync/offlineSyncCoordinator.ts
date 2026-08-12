import type { SyncRecord } from './syncTypes';
import type { OfflineSyncEngine, SyncResult } from './syncEngine';

export interface OfflineSyncCoordinatorOptions {
  onSync?: (result: SyncResult) => void | Promise<void>;
}

export class OfflineSyncCoordinator<T = unknown> {
  private flushing = false;
  private started = false;
  private readonly handleOnline = () => {
    void this.flush();
  };

  constructor(
    private readonly engine: OfflineSyncEngine<T>,
    private readonly options: OfflineSyncCoordinatorOptions = {},
  ) {}

  async enqueue(record: SyncRecord<T>): Promise<void> {
    await this.engine.enqueue(record);
    if (this.isOnline()) await this.flush();
  }

  async flush(): Promise<SyncResult> {
    if (this.flushing || !this.isOnline()) return { pushed: 0, conflicts: 0, failed: 0 };

    this.flushing = true;
    try {
      const result = await this.engine.flush();
      await this.options.onSync?.(result);
      return result;
    } finally {
      this.flushing = false;
    }
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    window.addEventListener('online', this.handleOnline);
    if (this.isOnline()) void this.flush();
  }

  stop(): void {
    if (!this.started || typeof window === 'undefined') return;
    this.started = false;
    window.removeEventListener('online', this.handleOnline);
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }
}
