import { healthRecordSchema, type HealthRecord } from "./healthRecordSchema";

export class IndexedDbRepository {
  private readonly dbName = "health-companion";
  private readonly storeName = "health-records";

  async save(record: HealthRecord): Promise<void> {
    const valid = healthRecordSchema.parse(record);
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).put(valid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(id: string): Promise<HealthRecord | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const request = tx.objectStore(this.storeName).get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? healthRecordSchema.parse(result) : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
