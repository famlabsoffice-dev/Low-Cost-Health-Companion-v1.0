export interface EncryptedBlobRecord {
  id: string;
  mimeType: string;
  encrypted: ArrayBuffer;
  iv: string;
  createdAt: number;
}

export class EncryptedBlobStore {
  private records = new Map<string, EncryptedBlobRecord>();

  async save(record: EncryptedBlobRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<EncryptedBlobRecord | null> {
    return this.records.get(id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }
}
