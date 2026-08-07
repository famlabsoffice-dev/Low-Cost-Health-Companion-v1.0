import type { EncryptedSecureRecord, SecureRecord } from './storageTypes';

export function validateSecureRecord(value: unknown): value is SecureRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number' &&
    typeof record.version === 'number';
}

export function validateEncryptedSecureRecord(value: unknown): value is EncryptedSecureRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, any>;
  return validateSecureRecord(record) &&
    typeof record.payload === 'object' &&
    record.payload.algorithm === 'AES-GCM' &&
    typeof record.payload.ciphertext === 'string' &&
    typeof record.payload.iv === 'string';
}
