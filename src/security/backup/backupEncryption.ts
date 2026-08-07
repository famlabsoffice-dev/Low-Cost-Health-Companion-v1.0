import { encryptAesGcm, decryptAesGcm } from '../crypto/aesGcm';

export interface EncryptedBackup {
  version: number;
  keyId: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
}

export class BackupEncryption {
  encrypt(payload: string, key: CryptoKey, keyId: string): Promise<EncryptedBackup> {
    return encryptAesGcm(payload, key).then(({ iv, ciphertext }) => ({
      version: 1,
      keyId,
      iv,
      ciphertext,
      createdAt: Date.now(),
    }));
  }

  decrypt(backup: EncryptedBackup, key: CryptoKey): Promise<string> {
    return decryptAesGcm(backup, key);
  }
}
