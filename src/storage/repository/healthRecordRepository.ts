import { z } from "zod";

export const HealthRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  type: z.string(),
  payload: z.record(z.unknown())
});

export type HealthRecord = z.infer<typeof HealthRecordSchema>;

const DB_NAME = "health-companion";
const STORE_NAME = "health-records";

export class HealthRecordRepository {
  private async database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async create(record: HealthRecord): Promise<HealthRecord> {
    const validated = HealthRecordSchema.parse(record);
    const db = await this.database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(validated);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return validated;
  }

  async get(id: string): Promise<HealthRecord | undefined> {
    const db = await this.database();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result ? HealthRecordSchema.parse(request.result) : undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
