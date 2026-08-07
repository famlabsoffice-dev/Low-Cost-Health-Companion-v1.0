export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  algorithm: 'AES-GCM';
  version: 1;
}

export interface CryptoKeyProvider {
  getKey(): Promise<CryptoKey>;
}

export interface CryptoEngine {
  encrypt(data: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): Promise<string>;
}
