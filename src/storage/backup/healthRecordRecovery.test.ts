import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultCryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { IndexedDbCryptoKeyStore, PersistentCryptoKeyProvider } from "../../security/keys/persistentCryptoKeyProvider";
import { healthRecordSchema, type HealthRecord } from "../healthRecordSchema";
import { IndexedDbStorageRepository } from "../repository/storageRepository";
import { HealthRecordRecoveryService } from "./healthRecordRecovery";

const HEALTH_DATABASE = "low-cost-health-companion";
const KEY_DATABASE = "recovery-test-key-store";

function createProvider(): PersistentCryptoKeyProvider {
  return new PersistentCryptoKeyProvider(new IndexedDbCryptoKeyStore(KEY_DATABASE));
}

function createPipeline(provider: PersistentCryptoKeyProvider) {
  return new DefaultCryptoPipeline(
    new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(provider, "device-root-key")),
  );
}

function createRepository(provider: PersistentCryptoKeyProvider) {
  return new IndexedDbStorageRepository(healthRecordSchema, createPipeline(provider));
}

function createRecord(id: string): HealthRecord {
  return {
    id,
    createdAt: "2026-08-09T14:00:00.000Z",
    updatedAt: "2026-08-09T14:01:00.000Z",
    type: "blood-pressure",
    payload: { systolic: 120, diastolic: 80 },
  };
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Database deletion blocked: ${name}`));
  });
}

beforeEach(async () => {
  await deleteDatabase(HEALTH_DATABASE);
  await deleteDatabase(KEY_DATABASE);
});

describe("HealthRecordRecoveryService", () => {
  it("restores encrypted health records after key recovery", async () => {
    const provider = createProvider();
    const repository = createRepository(provider);
    const service = new HealthRecordRecoveryService(provider, repository);

    await repository.save(createRecord("record-1"));
    const packageData = await service.createRecoveryPackage();
    expect(packageData.recoveryKey.version).toBe(1);
    expect(packageData.backup).not.toContain("blood-pressure");

    await deleteDatabase(HEALTH_DATABASE);
    await deleteDatabase(KEY_DATABASE);

    const restoredProvider = createProvider();
    const restoredService = new HealthRecordRecoveryService(restoredProvider);
    const result = await restoredService.restoreWithRecovery(packageData.backup, packageData.recoveryKey);
    expect(result).toEqual({ restoredCount: 1, keyVersion: 1 });

    await expect(createRepository(restoredProvider).get("record-1")).resolves.toEqual(createRecord("record-1"));
  });

  it("keeps existing encrypted data unchanged when backup authentication fails", async () => {
    const provider = createProvider();
    const repository = createRepository(provider);
    const service = new HealthRecordRecoveryService(provider, repository);

    await repository.save(createRecord("existing"));
    const packageData = await service.createRecoveryPackage();
    const parsed = JSON.parse(packageData.backup) as { payload: { ciphertext: string } };
    parsed.payload.ciphertext = `${parsed.payload.ciphertext.slice(0, -1)}A`;

    await expect(service.restoreWithRecovery(JSON.stringify(parsed), packageData.recoveryKey)).rejects.toThrow(
      "Invalid storage backup: authentication or decryption failed",
    );

    await expect(repository.get("existing")).resolves.toEqual(createRecord("existing"));
  });

  it("rejects a recovery key with a different version before modifying storage", async () => {
    const provider = createProvider();
    const repository = createRepository(provider);
    const service = new HealthRecordRecoveryService(provider, repository);

    await repository.save(createRecord("existing"));
    const packageData = await service.createRecoveryPackage();

    await expect(
      service.restoreWithRecovery(packageData.backup, {
        version: packageData.recoveryKey.version + 1,
        key: packageData.recoveryKey.key,
      }),
    ).rejects.toThrow("Recovery key version mismatch");

    await expect(repository.get("existing")).resolves.toEqual(createRecord("existing"));
  });
});
