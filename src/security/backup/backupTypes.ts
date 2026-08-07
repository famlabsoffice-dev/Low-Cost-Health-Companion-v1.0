export interface BackupEnvelope<T> {
  version: 1;
  keyVersion: string;
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
