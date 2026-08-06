export interface SecureRecord<T = unknown> {
  id: string;
  payload: T;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SecureStorage {
  set<T>(record: SecureRecord<T>): Promise<void>;
  get<T>(id: string): Promise<SecureRecord<T> | null>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
