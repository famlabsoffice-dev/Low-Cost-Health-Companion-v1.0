import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import type { EncryptedPayload } from '../crypto/cryptoTypes';

export class BackupRecoveryService {
  constructor(private readonly crypto: CryptoPipeline) {}

  async createBackup<T>(data: T, keyVersion: string) {
    return {
      version: 1 as const,
      keyVersion,
      payload: await this.crypto.encryptPayload(data),
    };
  }

  async restoreBackup<T>(backup: { payload: EncryptedPayload }): Promise<T> {
    return this.crypto.decryptPayload<T>(backup.payload);
  }

  async rotateBackupKey<T>(backup: { payload: EncryptedPayload }, nextKeyVersion: string) {
    const restored = await this.restoreBackup<T>(backup);
    return this.createBackup(restored, nextKeyVersion);
  }
}
