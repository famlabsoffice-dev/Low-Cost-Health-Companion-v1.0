export interface StorageBackupPayload<T> {
  version: 1;
  createdAt: string;
  entries: T[];
}

export class StorageBackupService<T> {
  export(entries: T[]): string {
    const payload: StorageBackupPayload<T> = {
      version: 1,
      createdAt: new Date().toISOString(),
      entries,
    };

    return JSON.stringify(payload);
  }

  import(serialized: string): StorageBackupPayload<T> {
    const payload = JSON.parse(serialized) as StorageBackupPayload<T>;

    if (payload.version !== 1 || !Array.isArray(payload.entries)) {
      throw new Error("Invalid storage backup payload");
    }

    return payload;
  }
}
