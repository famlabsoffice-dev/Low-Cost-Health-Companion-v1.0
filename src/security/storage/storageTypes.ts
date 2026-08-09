import type { EncryptedPayload } from '../crypto/cryptoTypes';

export interface SecureRecord<T = unknown> {
  id: string;
  payload: T;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface EncryptedSecureRecord {
  id: string;
  payload: EncryptedPayload;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SecureStorage {
  set(record: EncryptedSecureRecord): Promise<void>;
  get(id: string): Promise<EncryptedSecureRecord | null>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
