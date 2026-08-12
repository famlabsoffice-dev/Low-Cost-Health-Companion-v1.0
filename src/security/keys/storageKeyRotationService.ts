import type { StorageRepository } from '../../storage/repository/storageRepository';
import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';

export interface RotationBeforeRetirementHook {
  beforeRetirement(previousVersion: number, nextVersion: number): Promise<void>;
}

export class StorageKeyRotationService<T extends { id: string }> {
  constructor(
    private readonly keyProvider: PersistentStorageCryptoKeyProvider,
    private readonly repository: StorageRepository<T>,
  ) {}

  async rotate(hook?: RotationBeforeRetirementHook): Promise<number> {
    const previousVersion = await this.keyProvider.getCurrentKeyVersion();
    await this.keyProvider.rotate();
    const nextVersion = await this.keyProvider.getCurrentKeyVersion();

    if (nextVersion !== previousVersion + 1) {
      await this.keyProvider.rollbackRotation(previousVersion, nextVersion);
      throw new Error(`Crypto key rotation version mismatch: ${previousVersion} -> ${nextVersion}`);
    }

    try {
      await this.repository.reEncryptAll();
    } catch (error) {
      try {
        await this.keyProvider.rollbackRotation(previousVersion, nextVersion);
      } catch (rollbackError) {
        throw new Error(`Crypto key rotation re-encryption failed and rollback failed: ${error instanceof Error ? error.message : String(error)}; rollback=${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
      throw new Error(`Crypto key rotation re-encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (hook) await hook.beforeRetirement(previousVersion, nextVersion);

    await this.keyProvider.retireVersion(previousVersion);
    return nextVersion;
  }
}
