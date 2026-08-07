import type { CryptoPipeline } from '../crypto/cryptoPipeline';
import type { EncryptedPayload } from '../crypto/cryptoTypes';

export interface BackupEnvelope {
  version: 1;
  keyVersion: string;
  createdAt: number;
  payload: EncryptedPayload;
}

export interface BackupKeyResolver {
  resolve(version: string): Promise<CryptoPipeline>;
}

export class BackupRecoveryService {
  constructor(private readonly crypto: CryptoPipeline) {}

  async createBackup<T>(data: T, keyVersion: string): Promise<BackupEnvelope> {
    return {
      version: 1,
      keyVersion,
      createdAt: Date.now(),
      payload: await this.crypto.encryptPayload(data),
    };
  }

  async restoreBackup<T>(backup: BackupEnvelope): Promise<T> {
    return this.crypto.decryptPayload<T>(backup.payload);
  }

  async restoreWithRecovery<T>(backup: BackupEnvelope, resolver: BackupKeyResolver): Promise<T> {
    const pipeline = await resolver.resolve(backup.keyVersion);
    return pipeline.decryptPayload<T>(backup.payload);
  }

  async reEncryptBackup<T>(backup: BackupEnvelope, oldResolver: BackupKeyResolver, nextKeyVersion: string): Promise<BackupEnvelope> {
    const oldPipeline = await oldResolver.resolve(backup.keyVersion);
    const data = await oldPipeline.decryptPayload<T>(backup.payload);

    return {
      version: 1,
      keyVersion: nextKeyVersion,
      createdAt: Date.now(),
      payload: await this.crypto.encryptPayload(data),
    };
  }

  async rotateBackupKey<T>(backup: BackupEnvelope, nextKeyVersion: string): Promise<BackupEnvelope> {
    const restored = await this.restoreBackup<T>(backup);
    return this.createBackup(restored, nextKeyVersion);
  }
}
