import type { SyncQueue, SyncRecord } from './syncTypes';

const DATABASE_VERSION = 1;
const STORE_NAME = 'sync-queue';

export class IndexedDbSyncQueue<T = unknown> implements SyncQueue<T> {
  constructor(private readonly databaseName = 'low-cost-health-companion-sync') {}

  async enqueue(record: SyncRecord<T>): Promise<void> {
    validateRecord(record);
    const db = await this.open();
    try {
      await this.write(db, (store) => store.put(record));
    } finally {
      db.close();
    }
  }

  async pending(): Promise<SyncRecord<T>[]> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve((request.result as SyncRecord<T>[]).sort((a, b) => a.timestamp - b.timestamp));
        request.onerror = () => reject(request.error ?? new Error('Sync queue read failed'));
      });
    } finally {
      db.close();
    }
  }

  async remove(id: string): Promise<void> {
    const db = await this.open();
    try {
      await this.write(db, (store) => store.delete(id));
    } finally {
      db.close();
    }
  }

  async replace(record: SyncRecord<T>): Promise<void> {
    return this.enqueue(record);
  }

  async clear(): Promise<void> {
    const db = await this.open();
    try {
      await this.write(db, (store) => store.clear());
    } finally {
      db.close();
    }
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Sync queue database could not be opened'));
      request.onblocked = () => reject(new Error('Sync queue database upgrade is blocked'));
    });
  }

  private write(db: IDBDatabase, operation: (store: IDBObjectStore) => IDBRequest | void): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Sync queue transaction failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Sync queue transaction aborted'));
    });
  }
}

function validateRecord(record: SyncRecord): void {
  if (!record.id || !record.entity) throw new Error('Sync record id and entity are required');
  if (!['create', 'update', 'delete'].includes(record.operation)) throw new Error(`Invalid sync operation: ${record.operation}`);
  if (!Number.isSafeInteger(record.version) || record.version < 1) throw new Error(`Invalid sync version: ${record.version}`);
  if (!Number.isFinite(record.timestamp) || record.timestamp <= 0) throw new Error(`Invalid sync timestamp: ${record.timestamp}`);
  if (!Number.isSafeInteger(record.retries) || record.retries < 0) throw new Error(`Invalid sync retry count: ${record.retries}`);
}
