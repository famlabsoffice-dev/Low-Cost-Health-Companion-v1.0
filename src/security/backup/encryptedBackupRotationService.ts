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
    private readonly crypto: CryptoPipeline,
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

  private async migrateBackups(_previousVersion: number, nextVersion: number): Promise<void> {
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
        { resolve: async () => this.crypto },
        nextVersionLabel,
      );
      migrated.push([id, reEncrypted]);
    }

    await this.backupStore.replaceAll(migrated);
  }
}
