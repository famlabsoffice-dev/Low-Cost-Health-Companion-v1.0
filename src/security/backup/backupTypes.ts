export interface BackupEnvelope<T> {
  version: 1 | 2;
  keyVersion: string;
  createdAt?: number;
  payload: T;
}

export interface BackupStore {
  save<T>(backup: BackupEnvelope<T>): Promise<void>;
  load<T>(): Promise<BackupEnvelope<T>>;
}

export interface KeyRecoveryAdapter {
  exportKey(): Promise<JsonWebKey>;
  importKey(key: JsonWebKey): Promise<void>;
}

export interface PersistentKeyRecoveryStorageAdapter {
  save(keyVersion: string, key: JsonWebKey): Promise<void>;
  load(keyVersion: string): Promise<JsonWebKey | undefined>;
  remove(keyVersion: string): Promise<void>;
}
