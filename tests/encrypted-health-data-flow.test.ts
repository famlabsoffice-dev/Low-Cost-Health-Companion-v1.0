import { describe, expect, test } from "vitest";
import type { EncryptedPayload } from "../src/security/crypto/cryptoTypes";
import { DefaultCryptoPipeline } from "../src/security/crypto/cryptoPipeline";
import { IndexedDbStorageRepository } from "../src/storage/repository/storageRepository";
import { migratedHealthRecordSchema } from "../src/storage/repository/migrationSchema";

class DeterministicCryptoEngine {
  async encrypt(data: string): Promise<EncryptedPayload> {
    return {
      ciphertext: btoa(data),
      iv: "test-iv",
      algorithm: "AES-GCM",
      version: 1,
      keyVersion: 1,
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    return atob(payload.ciphertext);
  }
}

describe("encrypted health storage boundary", () => {
  test("persists health records as encrypted payloads and restores the domain value", async () => {
    const repository = new IndexedDbStorageRepository(
      migratedHealthRecordSchema,
      new DefaultCryptoPipeline(new DeterministicCryptoEngine()),
    );
    const record = {
      id: "encrypted-health-1",
      schemaVersion: 1,
      createdAt: "2026-08-12T12:00:00.000Z",
      updatedAt: "2026-08-12T12:00:00.000Z",
      type: "symptom",
      payload: { value: { symptom: "encrypted-private-symptom", severity: 4 } },
    };

    await repository.save(record);

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("low-cost-health-companion", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const stored = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction("secure-storage", "readonly").objectStore("secure-storage").get(record.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();

    const raw = JSON.stringify(stored);
    expect(raw).not.toContain("encrypted-private-symptom");
    expect(raw).not.toContain('"severity":4');
    expect(stored).toMatchObject({
      id: record.id,
      payload: {
        algorithm: "AES-GCM",
        keyVersion: 1,
      },
    });
    await expect(repository.get(record.id)).resolves.toEqual(record);
  });
});
