import { describe, expect, it } from 'vitest';

import { BackupRecoveryService } from './backupRecoveryService';

const pipeline = {
  async encryptPayload<T>(data: T) { return { ciphertext: JSON.stringify(data), iv: 'test', algorithm: 'AES-GCM' as const, version: 1 as const }; },
  async decryptPayload<T>(payload: { ciphertext: string }) { return JSON.parse(payload.ciphertext) as T; },
};

describe('large backup key rotation', () => {
  it('re-encrypts large datasets without data loss', async () => {
    const service = new BackupRecoveryService(pipeline);
    const payload = Array.from({ length: 10000 }, (_, index) => ({ id: index, value: 'health-record'.repeat(20) }));
    const backup = await service.createBackup(payload, 'v1');
    const rotated = await service.rotateBackupKey<typeof payload>(backup, 'v2');
    const restored = await service.restoreBackup<typeof payload>(rotated);
    expect(restored).toEqual(payload);
  });
});
