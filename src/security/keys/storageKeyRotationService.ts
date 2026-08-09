import type { StorageRepository } from '../../storage/repository/storageRepository';
import { PersistentStorageCryptoKeyProvider } from '../crypto/persistentCryptoKeyProvider';

export class StorageKeyRotationService<T extends { id: string }> {
  constructor(
    private readonly keyProvider: PersistentStorageCryptoKeyProvider,
    private readonly repository: StorageRepository<T>,
  ) {}

  async rotate(): Promise<number> {
    const previousVersion = await this.keyProvider.getCurrentKeyVersion();
    await this.keyProvider.rotate();
    const nextVersion = await this.keyProvider.getCurrentKeyVersion();

    if (nextVersion !== previousVersion + 1) {
      throw new Error(`Crypto key rotation version mismatch: ${previousVersion} -> ${nextVersion}`);
    }

    try {
      await this.repository.reEncryptAll();
    } catch (error) {
      throw new Error(`Crypto key rotation re-encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    await this.keyProvider.retireVersion(previousVersion);
    return nextVersion;
  }
}
