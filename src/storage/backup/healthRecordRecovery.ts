import { DefaultCryptoPipeline, type CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { PersistentCryptoKeyProvider } from "../../security/keys/persistentCryptoKeyProvider";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { healthRecordSchema, type HealthRecord } from "../healthRecordSchema";
import { IndexedDbStorageRepository, type StorageRepository } from "../repository/storageRepository";
import { HealthRecordBackupService } from "./healthRecordBackup";

export interface HealthRecordRecoveryKey {
  version: number;
  key: JsonWebKey;
}

export interface HealthRecordRecoveryResult {
  restoredCount: number;
  keyVersion: number;
}

export class HealthRecordRecoveryService {
  private readonly keyProvider: PersistentCryptoKeyProvider;
  private readonly cryptoPipeline: CryptoPipeline;
  private readonly backupService: HealthRecordBackupService;

  constructor(
    keyProvider = new PersistentCryptoKeyProvider(),
    repository?: StorageRepository<HealthRecord>,
  ) {
    this.keyProvider = keyProvider;
    this.cryptoPipeline = createPipeline(keyProvider);
    this.backupService = new HealthRecordBackupService(
      this.cryptoPipeline,
      repository ?? new IndexedDbStorageRepository(healthRecordSchema, this.cryptoPipeline),
    );
  }

  async createRecoveryPackage(): Promise<{ backup: string; recoveryKey: HealthRecordRecoveryKey }> {
    const version = await this.keyProvider.getCurrentVersion("device-root-key");
    const backup = await this.backupService.createBackup();
    const backupKeyVersion = readBackupKeyVersion(backup);
    if (backupKeyVersion !== version) {
      throw new Error(`Backup key version changed during export: expected ${version}, received ${backupKeyVersion}`);
    }
    const recoveryKey = await this.exportRecoveryKey(version);
    return { backup, recoveryKey };
  }

  async exportRecoveryKey(version?: number): Promise<HealthRecordRecoveryKey> {
    const keyVersion = version ?? await this.keyProvider.getCurrentVersion("device-root-key");
    const key = await this.keyProvider.getVersion("device-root-key", keyVersion);
    const exported = await crypto.subtle.exportKey("jwk", key);
    return { version: keyVersion, key: exported };
  }

  async importRecoveryKey(recoveryKey: HealthRecordRecoveryKey): Promise<void> {
    await this.keyProvider.importKeyForVersion("device-root-key", recoveryKey.key, recoveryKey.version);
  }

  async restoreWithRecovery(
    backup: string,
    recoveryKey: HealthRecordRecoveryKey,
  ): Promise<HealthRecordRecoveryResult> {
    const keyVersion = readBackupKeyVersion(backup);
    if (keyVersion !== recoveryKey.version) {
      throw new Error(`Recovery key version mismatch: backup=${keyVersion}, key=${recoveryKey.version}`);
    }

    await this.importRecoveryKey(recoveryKey);
    const restoredCount = await this.backupService.restoreBackup(backup);
    return { restoredCount, keyVersion };
  }

  async restore(backup: string): Promise<HealthRecordRecoveryResult> {
    const keyVersion = readBackupKeyVersion(backup);
    const restoredCount = await this.backupService.restoreBackup(backup);
    return { restoredCount, keyVersion };
  }
}

function createPipeline(keyProvider: PersistentCryptoKeyProvider): CryptoPipeline {
  return new DefaultCryptoPipeline(
    new WebCryptoEngine(new PersistentStorageCryptoKeyProvider(keyProvider, "device-root-key")),
  );
}

function readBackupKeyVersion(serialized: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("Invalid storage backup: malformed JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid storage backup: unsupported format");
  }

  const payload = (parsed as Record<string, unknown>).payload;
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid storage backup: unsupported format");
  }

  const keyVersion = (payload as Record<string, unknown>).keyVersion;
  if (!Number.isSafeInteger(keyVersion) || (keyVersion as number) < 1) {
    throw new Error("Invalid storage backup: unsupported key version");
  }

  return keyVersion as number;
}
