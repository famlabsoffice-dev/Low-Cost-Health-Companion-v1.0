export interface SecureRecord<T = unknown> {
  id: string;
  payload: T;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface EncryptedSecureRecord {
  id: string;
  payload: {
    ciphertext: string;
    iv: string;
    algorithm: 'AES-GCM';
    version: 1;
  };
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SecureStorage {
  set<T>(record: SecureRecord<T> | EncryptedSecureRecord): Promise<void>;
  get<T>(id: string): Promise<SecureRecord<T> | EncryptedSecureRecord | null>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
