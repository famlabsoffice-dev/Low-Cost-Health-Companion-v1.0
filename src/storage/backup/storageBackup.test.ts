import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { PersistentCryptoKeyProvider, IndexedDbCryptoKeyStore } from "../../security/keys/persistentCryptoKeyProvider";
import { DefaultCryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { StorageBackupService } from "./storageBackup";

interface Entry {
  id: string;
  value: string;
}

function createService(databaseName: string): StorageBackupService<Entry> {
  const provider = new PersistentStorageCryptoKeyProvider(
    new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(databaseName)),
    "backup-key",
  );
  const pipeline = new DefaultCryptoPipeline(new WebCryptoEngine(provider));
  return new StorageBackupService(pipeline, (entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid entry");
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.id !== "string" || candidate.id.length === 0 || typeof candidate.value !== "string") {
      throw new Error("Invalid entry");
    }
    return { id: candidate.id, value: candidate.value };
  });
}

describe("StorageBackupService", () => {
  it("round-trips encrypted backup data", async () => {
    const service = createService(`backup-roundtrip-${crypto.randomUUID()}`);
    const entries = [{ id: "one", value: "secret" }, { id: "two", value: "health" }];

    const serialized = await service.export(entries);
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("health");

    await expect(service.import(serialized)).resolves.toEqual({
      version: 1,
      createdAt: expect.any(String),
      entries,
    });
  });

  it("rejects tampered backups", async () => {
    const service = createService(`backup-tamper-${crypto.randomUUID()}`);
    const serialized = await service.export([{ id: "one", value: "secret" }]);
    const parsed = JSON.parse(serialized) as { payload: { ciphertext: string } };
    parsed.payload.ciphertext = `${parsed.payload.ciphertext.slice(0, -1)}A`;

    await expect(service.import(JSON.stringify(parsed))).rejects.toThrow(
      "Invalid storage backup: authentication or decryption failed",
    );
  });

  it("rejects cleartext and incompatible backup formats", async () => {
    const service = createService(`backup-format-${crypto.randomUUID()}`);

    await expect(service.import(JSON.stringify({ version: 1, entries: [] }))).rejects.toThrow(
      "Invalid storage backup: unsupported format",
    );
    await expect(service.import(JSON.stringify({ version: 1, createdAt: new Date().toISOString(), entries: [] }))).rejects.toThrow(
      "Invalid storage backup: unsupported format",
    );
    await expect(service.import("not-json")).rejects.toThrow("Invalid storage backup: malformed JSON");
  });

  it("rejects incompatible decrypted payloads", async () => {
    const service = createService(`backup-schema-${crypto.randomUUID()}`);
    const serialized = await service.export([{ id: "one", value: "secret" }]);
    const parsed = JSON.parse(serialized) as { payload: { ciphertext: string; iv: string; algorithm: "AES-GCM"; version: 1; keyVersion: number } };
    parsed.payload.iv = "AA==";

    await expect(service.import(JSON.stringify(parsed))).rejects.toThrow(
      "Invalid storage backup: authentication or decryption failed",
    );
  });
});
