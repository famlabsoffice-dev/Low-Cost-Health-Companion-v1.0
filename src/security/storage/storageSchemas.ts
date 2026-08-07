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
  if (!validateSecureRecord(value)) return false;

  const record = value as Record<string, unknown>;
  if (!record.payload || typeof record.payload !== 'object') return false;

  const payload = record.payload as Record<string, unknown>;
  return payload.algorithm === 'AES-GCM' &&
    payload.version === 1 &&
    typeof payload.ciphertext === 'string' &&
    typeof payload.iv === 'string';
}
