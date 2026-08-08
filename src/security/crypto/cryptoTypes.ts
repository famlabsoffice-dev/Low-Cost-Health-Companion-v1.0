export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  algorithm: 'AES-GCM';
  version: 1;
  keyVersion: number;
}

export interface CryptoKeyProvider {
  getKey(version?: number): Promise<CryptoKey>;
  getCurrentKeyVersion(): Promise<number>;
}

export interface CryptoEngine {
  encrypt(data: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): Promise<string>;
}
