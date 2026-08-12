export interface PersistentBackupAdapter {
  put<T>(id: string, value: T): Promise<void>;
  get<T>(id: string): Promise<T | undefined>;
  listIds(): Promise<string[]>;
  replaceAll<T>(entries: ReadonlyArray<readonly [string, T]>): Promise<void>;
}

export class IndexedDbBackupAdapter implements PersistentBackupAdapter {
  constructor(private readonly db = 'health-companion-backups') {}

  private async open(): Promise<IDBDatabase> {
    const request = indexedDB.open(this.db, 1);
    return new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('backups')) database.createObjectStore('backups');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Backup database could not be opened'));
      request.onblocked = () => reject(new Error('Backup database upgrade is blocked'));
    });
  }

  async put<T>(id: string, value: T): Promise<void> {
    const database = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction('backups', 'readwrite');
        tx.objectStore('backups').put(value, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error(`Backup persistence failed: ${id}`));
        tx.onabort = () => reject(tx.error ?? new Error(`Backup persistence aborted: ${id}`));
      });
    } finally {
      database.close();
    }
  }

  async get<T>(id: string): Promise<T | undefined> {
    const database = await this.open();
    try {
      return await new Promise<T | undefined>((resolve, reject) => {
        const tx = database.transaction('backups', 'readonly');
        const query = tx.objectStore('backups').get(id);
        query.onsuccess = () => resolve(query.result as T | undefined);
        query.onerror = () => reject(query.error ?? new Error(`Backup lookup failed: ${id}`));
      });
    } finally {
      database.close();
    }
  }

  async listIds(): Promise<string[]> {
    const database = await this.open();
    try {
      return await new Promise<string[]>((resolve, reject) => {
        const tx = database.transaction('backups', 'readonly');
        const request = tx.objectStore('backups').getAllKeys();
        request.onsuccess = () => resolve(request.result.map(String));
        request.onerror = () => reject(request.error ?? new Error('Backup inventory lookup failed'));
      });
    } finally {
      database.close();
    }
  }

  async replaceAll<T>(entries: ReadonlyArray<readonly [string, T]>): Promise<void> {
    const database = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.clear();
        for (const [id, value] of entries) store.put(value, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Atomic backup replacement failed'));
        tx.onabort = () => reject(tx.error ?? new Error('Atomic backup replacement aborted'));
      });
    } finally {
      database.close();
    }
  }
}
