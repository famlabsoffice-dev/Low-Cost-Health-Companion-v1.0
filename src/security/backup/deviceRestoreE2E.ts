import type { StorageRepository } from '../../storage/repository/storageRepository';
import { BackupRecoveryService, type BackupEnvelope } from './backupRecoveryService';
import { DeviceRestoreService, type DeviceKeyRecoveryPackage } from '../keys/deviceRestoreService';

export interface DeviceRestoreValidation<T> {
  readonly backup: BackupEnvelope;
  readonly recoveryPackage: DeviceKeyRecoveryPackage;
  readonly restored: T;
  readonly persisted: T;
}

export class DeviceRestoreE2E<T extends { id: string }> {
  constructor(
    private readonly backupRecovery: BackupRecoveryService,
    private readonly deviceRestore: DeviceRestoreService,
  ) {}

  async execute(
    data: T,
    keyVersion: string,
    repository: StorageRepository<T>,
  ): Promise<DeviceRestoreValidation<T>> {
    const numericKeyVersion = Number(keyVersion);
    if (!Number.isSafeInteger(numericKeyVersion) || numericKeyVersion < 1) {
      throw new Error(`Invalid device restore key version: ${keyVersion}`);
    }
    const backup = await this.backupRecovery.createBackup(data, keyVersion);
    const recoveryPackage = await this.deviceRestore.createRecoveryPackage(numericKeyVersion);
    await this.deviceRestore.restoreFromRecoveryPackage(recoveryPackage);
    const restored = await this.backupRecovery.restoreBackup<T>(backup);
    const persisted = await this.backupRecovery.restoreIntoStorage<T>(backup, {
      resolve: async () => this.backupRecoveryCrypto(),
    }, repository);
    if (JSON.stringify(restored) !== JSON.stringify(data)) throw new Error('Device restore validation failed: decrypted data mismatch');
    if (JSON.stringify(persisted) !== JSON.stringify(data)) throw new Error('Device restore validation failed: persisted data mismatch');
    return { backup, recoveryPackage, restored, persisted };
  }

  private backupRecoveryCrypto() {
    return (this.backupRecovery as unknown as { crypto: import('../crypto/cryptoPipeline').CryptoPipeline }).crypto;
  }
}
