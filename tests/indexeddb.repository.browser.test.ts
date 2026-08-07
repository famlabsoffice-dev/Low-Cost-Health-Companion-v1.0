import "fake-indexeddb/auto";

import { IndexedDbStorageRepository } from "../src/storage/repository/storageRepository";
import type { CryptoPipeline } from "../src/security/crypto/cryptoPipeline";
import type { EncryptedPayload } from "../src/security/crypto/cryptoTypes";

type TestRecord = {
  id: string;
  value: string;
};

const schema = {
  safeParse(value: unknown) {
    const record = value as Partial<TestRecord>;

    if (typeof record.id === "string" && typeof record.value === "string") {
      return { success: true, data: record as TestRecord };
    }

    return { success: false };
  },
};

class TestCryptoPipeline implements CryptoPipeline {
  async encryptPayload<T>(payload: T): Promise<EncryptedPayload> {
    return {
      ciphertext: btoa(JSON.stringify(payload)),
      iv: "test-iv",
      algorithm: "AES-GCM",
      version: 1,
    };
  }

  async decryptPayload<T>(payload: EncryptedPayload): Promise<T> {
    return JSON.parse(atob(payload.ciphertext)) as T;
  }
}

describe("IndexedDB secure storage repository", () => {
  const cryptoPipeline = new TestCryptoPipeline();

  it("persists encrypted payloads and retrieves decrypted validated records", async () => {
    const repository = new IndexedDbStorageRepository<TestRecord>(schema, cryptoPipeline);

    await repository.save({ id: "secure-test", value: "encrypted-runtime" });

    await expect(repository.get("secure-test")).resolves.toEqual({
      id: "secure-test",
      value: "encrypted-runtime",
    });
  });

  it("removes secure records", async () => {
    const repository = new IndexedDbStorageRepository<TestRecord>(schema, cryptoPipeline);

    await repository.save({ id: "delete-test", value: "remove-me" });
    await repository.remove("delete-test");

    await expect(repository.get("delete-test")).resolves.toBeNull();
  });

  it("rejects invalid decrypted payloads", async () => {
    const repository = new IndexedDbStorageRepository<TestRecord>(schema, {
      async encryptPayload() {
        return {
          ciphertext: btoa(JSON.stringify({ invalid: true })),
          iv: "test-iv",
          algorithm: "AES-GCM",
          version: 1,
        };
      },
      async decryptPayload() {
        return { invalid: true } as TestRecord;
      },
    });

    await repository.save({ id: "invalid-test", value: "payload" });

    await expect(repository.get("invalid-test")).rejects.toThrow(
      "Invalid decrypted storage payload",
    );
  });
});
