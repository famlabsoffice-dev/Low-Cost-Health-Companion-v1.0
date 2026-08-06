export interface SecureRecord<T> {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
  payload: T;
}

export interface StorageMetadata {
  version: number;
  createdAt: string;
  updatedAt: string;
}
