export interface BackupRecord {
  id: string;
  envelope: unknown;
}

export class IndexedDbRestoreAdapter {
  constructor(private readonly databaseName: string, private readonly storeName: string) {}

  async save(record: BackupRecord): Promise<void> {
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async restore(id: string): Promise<BackupRecord | undefined> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).get(id);
      request.onsuccess = () => resolve(request.result as BackupRecord | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
