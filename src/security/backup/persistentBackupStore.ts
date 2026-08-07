import type { BackupEnvelope, BackupStore } from './backupTypes';
import type { PersistentBackupAdapter } from './indexedDbBackupAdapter';

export class PersistentBackupStore implements BackupStore {
  constructor(private readonly adapter: PersistentBackupAdapter, private readonly id = 'primary') {}

  save<T>(backup: BackupEnvelope<T>): Promise<void> {
    return this.adapter.put(this.id, backup);
  }

  async load<T>(): Promise<BackupEnvelope<T>> {
    const backup = await this.adapter.get<BackupEnvelope<T>>(this.id);
    if (!backup) throw new Error('backup unavailable');
    return backup;
  }
}
