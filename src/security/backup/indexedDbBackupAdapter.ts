export interface PersistentBackupAdapter {
  put<T>(id: string, value: T): Promise<void>;
  get<T>(id: string): Promise<T | undefined>;
}

export class IndexedDbBackupAdapter implements PersistentBackupAdapter {
  constructor(private readonly db = 'health-companion-backups') {}

  async put<T>(id: string, value: T): Promise<void> {
    const request = indexedDB.open(this.db, 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => request.result.createObjectStore('backups');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('backups', 'readwrite');
      tx.objectStore('backups').put(value, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get<T>(id: string): Promise<T | undefined> {
    const request = indexedDB.open(this.db, 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => request.result.createObjectStore('backups');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = database.transaction('backups', 'readonly');
      const query = tx.objectStore('backups').get(id);
      query.onsuccess = () => resolve(query.result as T | undefined);
      query.onerror = () => reject(query.error);
    });
  }
}
