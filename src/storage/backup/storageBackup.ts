import type { CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import type { EncryptedPayload } from "../../security/crypto/cryptoTypes";

export interface StorageBackupPayload<T> {
  version: 1;
  createdAt: string;
  entries: T[];
}

export interface EncryptedStorageBackup {
  format: "low-cost-health-companion-backup";
  version: 1;
  payload: EncryptedPayload;
}

const MAX_BACKUP_BYTES = 64 * 1024 * 1024;

export class StorageBackupService<T> {
  constructor(
    private readonly cryptoPipeline: CryptoPipeline,
    private readonly validateEntry: (entry: unknown) => T,
  ) {}

  async export(entries: readonly T[]): Promise<string> {
    const validatedEntries = entries.map((entry) => this.validateEntry(entry));
    const payload: StorageBackupPayload<T> = {
      version: 1,
      createdAt: new Date().toISOString(),
      entries: validatedEntries,
    };

    const encryptedPayload = await this.cryptoPipeline.encryptPayload(payload);
    const backup: EncryptedStorageBackup = {
      format: "low-cost-health-companion-backup",
      version: 1,
      payload: encryptedPayload,
    };
    const serialized = JSON.stringify(backup);
    this.assertSize(serialized);
    return serialized;
  }

  async import(serialized: string): Promise<StorageBackupPayload<T>> {
    this.assertSize(serialized);

    let backup: unknown;
    try {
      backup = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("Invalid storage backup: malformed JSON");
    }

    if (!this.isEncryptedBackup(backup)) {
      throw new Error("Invalid storage backup: unsupported format");
    }

    let payload: unknown;
    try {
      payload = await this.cryptoPipeline.decryptPayload<unknown>(backup.payload);
    } catch {
      throw new Error("Invalid storage backup: authentication or decryption failed");
    }

    if (!this.isBackupPayload(payload)) {
      throw new Error("Invalid storage backup: incompatible payload");
    }

    const entries = payload.entries.map((entry) => this.validateEntry(entry));
    return {
      version: 1,
      createdAt: payload.createdAt,
      entries,
    };
  }

  private assertSize(serialized: string): void {
    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes > MAX_BACKUP_BYTES) {
      throw new Error(`Storage backup exceeds maximum size of ${MAX_BACKUP_BYTES} bytes`);
    }
  }

  private isEncryptedBackup(value: unknown): value is EncryptedStorageBackup {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    if (candidate.format !== "low-cost-health-companion-backup" || candidate.version !== 1) return false;
    if (!candidate.payload || typeof candidate.payload !== "object") return false;
    const payload = candidate.payload as Record<string, unknown>;
    return (
      payload.algorithm === "AES-GCM" &&
      payload.version === 1 &&
      typeof payload.ciphertext === "string" &&
      payload.ciphertext.length > 0 &&
      typeof payload.iv === "string" &&
      payload.iv.length > 0 &&
      Number.isSafeInteger(payload.keyVersion) &&
      (payload.keyVersion as number) >= 1
    );
  }

  private isBackupPayload(value: unknown): value is StorageBackupPayload<unknown> {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return (
      candidate.version === 1 &&
      typeof candidate.createdAt === "string" &&
      Number.isNaN(Date.parse(candidate.createdAt)) === false &&
      Array.isArray(candidate.entries)
    );
  }
}
