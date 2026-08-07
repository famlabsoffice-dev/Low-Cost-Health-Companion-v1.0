import type { EncryptedPayload } from './cryptoTypes';

export interface SecurePayload {
  id: string;
  payload: EncryptedPayload;
  createdAt: string;
  updatedAt: string;
  version: number;
}
