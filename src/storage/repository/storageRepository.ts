import type { CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import type { EncryptedPayload } from "../../security/crypto/cryptoTypes";
import { validateStorageInput } from "../schemas/storageSchemas";

export interface StorageRepository<T> {
  save(value: unknown): Promise<T>;
  get(id: string): Promise<T | null>;
  listAll(): Promise<T[]>;
  remove(id: string): Promise<void>;
}

interface SecureStoredRecord {
  id: string;
  payload: EncryptedPayload;
}

export class IndexedDbStorageRepository<T extends { id: string }> implements StorageRepository<T> {
  private readonly databaseName = "low-cost-health-companion";
  private readonly storeName = "secure-storage";
  private readonly schema: { safeParse(value: unknown): { success: boolean; data?: T } };

  constructor(
    schema: { safeParse(value: unknown): { success: boolean; data?: T } },
    private readonly cryptoPipeline: CryptoPipeline,
  ) {
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
      request.onblocked = () => reject(new Error("Secure storage database open blocked"));
    });
  }

  async save(value: unknown): Promise<T> {
    const result = validateStorageInput(this.schema, value);
    if (!result.success || !result.data) throw new Error("Invalid storage payload");

    const encrypted = await this.cryptoPipeline.encryptPayload(result.data);
    const database = await this.openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(this.storeName, "readwrite");
        transaction.objectStore(this.storeName).put({ id: result.data.id, payload: encrypted } satisfies SecureStoredRecord);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("Secure storage save transaction aborted"));
      });
    } finally {
      database.close();
    }
    return result.data;
  }

  async get(id: string): Promise<T | null> {
    const database = await this.openDatabase();
    try {
      const record = await new Promise<SecureStoredRecord | null>((resolve, reject) => {
        const transaction = database.transaction(this.storeName, "readonly");
        const request = transaction.objectStore(this.storeName).get(id);
        request.onsuccess = () => resolve((request.result as SecureStoredRecord | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
      if (!record) return null;
      const decrypted = await this.cryptoPipeline.decryptPayload<T>(record.payload);
      const result = validateStorageInput(this.schema, decrypted);
      if (!result.success || !result.data) throw new Error("Invalid decrypted storage payload");
      return result.data;
    } finally {
      database.close();
    }
  }

  async listAll(): Promise<T[]> {
    const database = await this.openDatabase();
    try {
      const records = await new Promise<SecureStoredRecord[]>((resolve, reject) => {
        const transaction = database.transaction(this.storeName, "readonly");
        const request = transaction.objectStore(this.storeName).getAll();
        request.onsuccess = () => resolve(request.result as SecureStoredRecord[]);
        request.onerror = () => reject(request.error);
      });
      const values: T[] = [];
      for (const record of records) {
        const decrypted = await this.cryptoPipeline.decryptPayload<T>(record.payload);
        const result = validateStorageInput(this.schema, decrypted);
        if (!result.success || !result.data) throw new Error(`Invalid decrypted storage payload: ${record.id}`);
        values.push(result.data);
      }
      return values;
    } finally {
      database.close();
    }
  }

  async remove(id: string): Promise<void> {
    const database = await this.openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(this.storeName, "readwrite");
        transaction.objectStore(this.storeName).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("Secure storage removal transaction aborted"));
      });
    } finally {
      database.close();
    }
  }
}
