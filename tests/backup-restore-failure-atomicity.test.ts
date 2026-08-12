import { describe, expect, test } from "vitest";
import { BackupRecoveryService } from "../src/security/backup/backupRecoveryService";
import type { StorageRepository } from "../src/storage/repository/storageRepository";
import type { CryptoPipeline } from "../src/security/crypto/cryptoPipeline";

type RecordValue = { id: string; value: string };

class AtomicRepository implements StorageRepository<RecordValue> {
  constructor(private records: RecordValue[]) {}

  async save(value: unknown): Promise<RecordValue> { const record = value as RecordValue; this.records = [...this.records.filter((item) => item.id !== record.id), record]; return record; }
  async saveMany(values: readonly unknown[]): Promise<RecordValue[]> { const records = values as RecordValue[]; for (const record of records) await this.save(record); return records; }
  async get(id: string): Promise<RecordValue | null> { return this.records.find((record) => record.id === id) ?? null; }
  async listAll(): Promise<RecordValue[]> { return [...this.records]; }
  async replaceAll(values: readonly unknown[]): Promise<RecordValue[]> { this.records = [...(values as RecordValue[])]; return [...this.records]; }
  async reEncryptAll(): Promise<RecordValue[]> { return this.listAll(); }
  async remove(id: string): Promise<void> { this.records = this.records.filter((record) => record.id !== id); }
}

describe("backup restore failure atomicity", () => {
  test("does not mutate storage when backup decryption fails", async () => {
    const existing: RecordValue = { id: "existing", value: "preserve" };
    const repository = new AtomicRepository([existing]);
    const crypto = {
      encryptPayload: async () => ({ algorithm: "AES-GCM", version: 1, ciphertext: "cipher", iv: "iv", keyVersion: 1 }),
      decryptPayload: async () => { throw new Error("authentication failed"); },
    } as unknown as CryptoPipeline;
    const recovery = new BackupRecoveryService(crypto);
    const backup = {
      version: 2 as const,
      keyVersion: "1",
      createdAt: Date.now(),
      payload: { algorithm: "AES-GCM" as const, version: 1 as const, ciphertext: "cipher", iv: "iv", keyVersion: 1 },
    };

    await expect(recovery.restoreIntoStorage<RecordValue>(backup, { resolve: async () => crypto }, repository)).rejects.toThrow("authentication failed");
    expect(await repository.listAll()).toEqual([existing]);
  });
});
