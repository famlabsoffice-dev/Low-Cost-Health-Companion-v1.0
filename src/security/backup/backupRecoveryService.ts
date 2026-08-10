import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import type { EncryptedPayload } from '../crypto/cryptoTypes';
import type { BackupEnvelope as StoredBackupEnvelope } from './backupTypes';
import type { StorageRepository } from '../../storage/repository/storageRepository';

export type BackupEnvelope = StoredBackupEnvelope<EncryptedPayload>;

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
    if ('version' in backup) {
      if (backup.version !== 2) {
        throw new Error('Invalid backup envelope version');
      }

      return backup;
    }

    return {
      version: 2,
      keyVersion: backup.keyVersion,
      createdAt: Date.now(),
      payload: backup.payload,
    };
  }

  private validateEnvelope(backup: BackupEnvelope): void {
    if (backup.version !== 2) {
      throw new Error('Invalid backup envelope version');
    }

    if (typeof backup.keyVersion !== 'string' || backup.keyVersion.length === 0) {
      throw new Error('Invalid backup key version');
    }

    if (
      backup.createdAt !== undefined &&
      (!Number.isFinite(backup.createdAt) || backup.createdAt < 0)
    ) {
      throw new Error('Invalid backup creation timestamp');
    }

    if (
      backup.payload === null ||
      typeof backup.payload !== 'object' ||
      backup.payload.algorithm !== 'AES-GCM' ||
      backup.payload.version !== 1 ||
      typeof backup.payload.ciphertext !== 'string' ||
      backup.payload.ciphertext.length === 0 ||
      typeof backup.payload.iv !== 'string' ||
      backup.payload.iv.length === 0 ||
      !Number.isInteger(backup.payload.keyVersion) ||
      backup.payload.keyVersion < 1
    ) {
      throw new Error('Invalid encrypted backup payload');
    }

    if (String(backup.payload.keyVersion) !== backup.keyVersion) {
      throw new Error('Backup key version does not match encrypted payload key version');
    }
  }

  async createBackup<T>(data: T, keyVersion: string): Promise<BackupEnvelope> {
    const backup: BackupEnvelope = {
      version: 2,
      keyVersion,
      createdAt: Date.now(),
      payload: await this.crypto.encryptPayload(data),
    };

    this.validateEnvelope(backup);
    return backup;
  }

  async restoreBackup<T>(
    backup: LegacyBackupEnvelope | BackupEnvelope,
  ): Promise<T> {
    const migrated = this.migrateEnvelope(backup);
    this.validateEnvelope(migrated);

    return this.crypto.decryptPayload<T>(migrated.payload);
  }

  async restoreWithRecovery<T>(
    backup: LegacyBackupEnvelope | BackupEnvelope,
    resolver: BackupKeyResolver,
  ): Promise<T> {
    const migrated = this.migrateEnvelope(backup);
    this.validateEnvelope(migrated);

    const pipeline = await resolver.resolve(migrated.keyVersion);
    return pipeline.decryptPayload<T>(migrated.payload);
  }

  async restoreIntoStorage<T extends { id: string }>(
    backup: LegacyBackupEnvelope | BackupEnvelope,
    resolver: BackupKeyResolver,
    repository: StorageRepository<T>,
  ): Promise<T> {
    const restored = await this.restoreWithRecovery<T>(backup, resolver);
    const [saved] = await repository.replaceAll([restored]);

    if (!saved) {
      throw new Error('Atomic backup restore produced no stored record');
    }

    return saved;
  }

  async reEncryptBackup<T>(
    backup: LegacyBackupEnvelope | BackupEnvelope,
    oldResolver: BackupKeyResolver,
    nextKeyVersion: string,
  ): Promise<BackupEnvelope> {
    const migrated = this.migrateEnvelope(backup);
    this.validateEnvelope(migrated);

    const oldPipeline = await oldResolver.resolve(migrated.keyVersion);
    const data = await oldPipeline.decryptPayload<T>(migrated.payload);

    return this.createBackup(data, nextKeyVersion);
  }

  async rotateBackupKey<T>(
    backup: LegacyBackupEnvelope | BackupEnvelope,
    nextKeyVersion: string,
  ): Promise<BackupEnvelope> {
    const restored = await this.restoreBackup<T>(backup);
    return this.createBackup(restored, nextKeyVersion);
  }
}
