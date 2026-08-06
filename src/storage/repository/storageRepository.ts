import { validateStorageInput } from "../schemas/storageSchemas";

export interface StorageRepository<T> {
  save(value: unknown): Promise<T>;
  get(id: string): Promise<T | null>;
  remove(id: string): Promise<void>;
}

export class IndexedDbStorageRepository<T extends { id: string }> implements StorageRepository<T> {
  private readonly databaseName = "low-cost-health-companion";
  private readonly storeName = "secure-storage";
  private readonly schema: { safeParse(value: unknown): { success: boolean; data?: T } };

  constructor(schema: { safeParse(value: unknown): { success: boolean; data?: T } }) {
    this.schema = schema;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(value: unknown): Promise<T> {
    const result = validateStorageInput(this.schema, value);

    if (!result.success || !result.data) {
      throw new Error("Invalid storage payload");
    }

    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readwrite");
      transaction.objectStore(this.storeName).put(result.data);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    return result.data;
  }

  async get(id: string): Promise<T | null> {
    const database = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readonly");
      const request = transaction.objectStore(this.storeName).get(id);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: string): Promise<void> {
    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readwrite");
      transaction.objectStore(this.storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
