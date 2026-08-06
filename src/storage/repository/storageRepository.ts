import { validateStorageInput } from "../schemas/storageSchemas";

export interface StorageRepository<T> {
  save(value: unknown): Promise<T>;
  get(id: string): Promise<T | null>;
  remove(id: string): Promise<void>;
}

export class IndexedDbStorageRepository<T extends { id: string }> implements StorageRepository<T> {
  private readonly store = new Map<string, T>();
  private readonly schema: { safeParse(value: unknown): { success: boolean; data?: T } };

  constructor(schema: { safeParse(value: unknown): { success: boolean; data?: T } }) {
    this.schema = schema;
  }

  async save(value: unknown): Promise<T> {
    const result = validateStorageInput(this.schema, value);

    if (!result.success || !result.data) {
      throw new Error("Invalid storage payload");
    }

    this.store.set(result.data.id, result.data);
    return result.data;
  }

  async get(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }
}
