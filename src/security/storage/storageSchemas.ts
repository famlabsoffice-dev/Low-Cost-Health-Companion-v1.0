import { z } from 'zod';

import type { EncryptedSecureRecord, SecureRecord } from './storageTypes';

const encryptedPayloadSchema = z.object({
  ciphertext: z.string(),
  iv: z.string(),
  algorithm: z.literal('AES-GCM'),
  version: z.literal(1),
  keyVersion: z.number().int().nonnegative(),
});

const secureRecordSchema = z.object({
  id: z.string().min(1),
  payload: z.unknown(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
  version: z.number().int().positive(),
});

export function validateSecureRecord<T = unknown>(
  value: unknown,
): value is SecureRecord<T> {
  return secureRecordSchema.safeParse(value).success;
}

export function validateEncryptedSecureRecord(
  value: unknown,
): value is EncryptedSecureRecord {
  return secureRecordSchema
    .extend({
      payload: encryptedPayloadSchema,
    })
    .safeParse(value).success;
}

export function isEncryptedSecureRecord(
  value: unknown,
): value is EncryptedSecureRecord {
  return validateEncryptedSecureRecord(value);
}

export function validateStorageInput<T>(
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
  value: unknown,
) {
  return schema.safeParse(value);
}
