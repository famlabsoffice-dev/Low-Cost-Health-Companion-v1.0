import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import type { EncryptedPayload } from '../crypto/cryptoTypes';

export interface BackupEnvelope {
  version: 1 | 2;
  keyVersion: string;
  createdAt: number;
  payload: EncryptedPayload;
}

export interface LegacyBackupEnvelope {
  keyVersion: string;
  payload: EncryptedPayload;
}

export interface BackupKeyResolver {
  resolve(version: string): Promise<CryptoPipeline>;
}

export class BackupRecoveryService {
  constructor(private readonly crypto: CryptoPipeline) {}

  migrateEnvelope(backup: LegacyBackupEnvelope | BackupEnvelope): BackupEnvelope {
    if (backup.version === 2) return backup;

    return {
      version: 2,
      keyVersion: backup.keyVersion,
      createdAt: 'createdAt' in backup ? backup.createdAt : Date.now(),
      payload: backup.payload,
    };
  }

  async createBackup<T>(data: T, keyVersion: string): Promise<BackupEnvelope> {
    return {
      version: 2,
      keyVersion,
      createdAt: Date.now(),
      payload: await this.crypto.encryptPayload(data),
    };
  }

  async restoreBackup<T>(backup: LegacyBackupEnvelope | BackupEnvelope): Promise<T> {
    const migrated = this.migrateEnvelope(backup);
    return this.crypto.decryptPayload<T>(migrated.payload);
  }

  async restoreWithRecovery<T>(backup: LegacyBackupEnvelope | BackupEnvelope, resolver: BackupKeyResolver): Promise<T> {
    const migrated = this.migrateEnvelope(backup);
    const pipeline = await resolver.resolve(migrated.keyVersion);
    return pipeline.decryptPayload<T>(migrated.payload);
  }

  async reEncryptBackup<T>(backup: LegacyBackupEnvelope | BackupEnvelope, oldResolver: BackupKeyResolver, nextKeyVersion: string): Promise<BackupEnvelope> {
    const migrated = this.migrateEnvelope(backup);
    const oldPipeline = await oldResolver.resolve(migrated.keyVersion);
    const data = await oldPipeline.decryptPayload<T>(migrated.payload);

    return {
      version: 2,
      keyVersion: nextKeyVersion,
      createdAt: Date.now(),
      payload: await this.crypto.encryptPayload(data),
    };
  }

  async rotateBackupKey<T>(backup: LegacyBackupEnvelope | BackupEnvelope, nextKeyVersion: string): Promise<BackupEnvelope> {
    const restored = await this.restoreBackup<T>(backup);
    return this.createBackup(restored, nextKeyVersion);
  }
}
