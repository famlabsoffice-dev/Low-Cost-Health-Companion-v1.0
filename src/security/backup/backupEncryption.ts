import { decryptData, encryptData } from '../crypto/aesGcm';

export interface EncryptedBackup {
  version: number;
  keyId: string;
  payload: string;
  createdAt: number;
}

export class BackupEncryption {
  async encrypt(payload: string, key: CryptoKey, keyId: string): Promise<EncryptedBackup> {
    return {
      version: 1,
      keyId,
      payload: await encryptData(payload, key),
      createdAt: Date.now(),
    };
  }

  decrypt(backup: EncryptedBackup, key: CryptoKey): Promise<string> {
    return decryptData(backup.payload, key);
  }
}
