import { healthRecordSchema, type HealthRecord } from "./healthRecordSchema";

export type { HealthRecord } from "./healthRecordSchema";

export class IndexedDbRepository {
  private readonly dbName = "health-companion";
  private readonly storeName = "health-records";

  async save(record: HealthRecord): Promise<void> {
    const valid = healthRecordSchema.parse(record);
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put(valid);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("Health record save transaction aborted"));
      });
    } finally {
      db.close();
    }
  }

  async get(id: string): Promise<HealthRecord | undefined> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const request = tx.objectStore(this.storeName).get(id);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? healthRecordSchema.parse(result) : undefined);
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async listAll(): Promise<HealthRecord[]> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const request = tx.objectStore(this.storeName).getAll();
        request.onsuccess = () => resolve(request.result.map((record: unknown) => healthRecordSchema.parse(record)));
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async replaceAll(records: readonly HealthRecord[]): Promise<void> {
    const validRecords = records.map((record) => healthRecordSchema.parse(record));
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        store.clear();
        for (const record of validRecords) store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("Health record restore transaction aborted"));
      });
    } finally {
      db.close();
    }
  }

  async remove(id: string): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("Health record deletion transaction aborted"));
      });
    } finally {
      db.close();
    }
  }

  async removeMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        for (const id of ids) store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("Legacy storage migration deletion aborted"));
      });
    } finally {
      db.close();
    }
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Health record database open blocked"));
    });
  }
}
