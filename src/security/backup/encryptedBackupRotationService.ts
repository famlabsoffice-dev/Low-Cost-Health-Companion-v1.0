import type { StorageRepository } from '../../storage/repository/storageRepository';
import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import type { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';
import { BackupRecoveryService, type BackupEnvelope, type LegacyBackupEnvelope } from './backupRecoveryService';
import type { PersistentBackupAdapter } from './indexedDbBackupAdapter';
import { StorageKeyRotationService } from '../keys/storageKeyRotationService';

export type StoredBackup = LegacyBackupEnvelope | BackupEnvelope;

export class EncryptedBackupRotationService<T extends { id: string }> {
  private readonly backupRecovery: BackupRecoveryService;
  private readonly storageRotation: StorageKeyRotationService<T>;

  constructor(
    private readonly keyProvider: PersistentStorageCryptoKeyProvider,
    private readonly backupStore: PersistentBackupAdapter,
    crypto: CryptoPipeline,
    repository: StorageRepository<T>,
  ) {
    this.backupRecovery = new BackupRecoveryService(crypto);
    this.storageRotation = new StorageKeyRotationService(keyProvider, repository);
  }

  async rotate(): Promise<number> {
    return this.storageRotation.rotate({
      beforeRetirement: async (previousVersion, nextVersion) => {
        await this.migrateBackups(previousVersion, nextVersion);
      },
    });
  }

  private async migrateBackups(previousVersion: number, nextVersion: number): Promise<void> {
    const ids = await this.backupStore.listIds();
    const migrated: Array<readonly [string, BackupEnvelope]> = [];
    const nextVersionLabel = String(nextVersion);

    for (const id of ids) {
      const backup = await this.backupStore.get<StoredBackup>(id);
      if (!backup) throw new Error(`Backup disappeared during key rotation: ${id}`);

      if (backup.payload.keyVersion === nextVersion && backup.keyVersion === nextVersionLabel) {
        migrated.push([id, backup as BackupEnvelope]);
        continue;
      }

      const reEncrypted = await this.backupRecovery.reEncryptBackup<T>(
        backup,
        {
          resolve: async (version) => {
            const numericVersion = Number(version);
            if (!Number.isInteger(numericVersion) || numericVersion < 1) {
              throw new Error(`Invalid backup key version: ${version}`);
            }
            return this.keyProviderPipeline;
          },
        },
        nextVersionLabel,
      );
      migrated.push([id, reEncrypted]);
    }

    await this.backupStore.replaceAll(migrated);
    void previousVersion;
  }

  private readonly keyProviderPipeline: CryptoPipeline = {
    encryptPayload: async <U>(data: U) => {
      const { DefaultCryptoPipeline } = await import('../crypto/cryptoPipeline');
      const { WebCryptoEngine } = await import('../crypto/webCryptoEngine');
      return new DefaultCryptoPipeline(new WebCryptoEngine(this.keyProvider)).encryptPayload(data);
    },
    decryptPayload: async <U>(payload) => {
      const { DefaultCryptoPipeline } = await import('../crypto/cryptoPipeline');
      const { WebCryptoEngine } = await import('../crypto/webCryptoEngine');
      return new DefaultCryptoPipeline(new WebCryptoEngine(this.keyProvider)).decryptPayload<U>(payload);
    },
  };
}
