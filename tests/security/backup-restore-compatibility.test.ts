import { describe, expect, it } from 'vitest';
import type { CryptoPipeline } from '../../src/security/crypto/cryptoPipeline';
import type { EncryptedPayload } from '../../src/security/crypto/cryptoTypes';
import { BackupRecoveryService, type BackupEnvelope, type LegacyBackupEnvelope } from '../../src/security/backup/backupRecoveryService';

class CompatibilityCryptoPipeline implements CryptoPipeline {
  async encryptPayload<T>(payload: T): Promise<EncryptedPayload> {
    return {
      ciphertext: btoa(JSON.stringify(payload)),
      iv: 'compatibility-iv',
      algorithm: 'AES-GCM',
      version: 1,
      keyVersion: 3,
    };
  }

  async decryptPayload<T>(payload: EncryptedPayload): Promise<T> {
    return JSON.parse(atob(payload.ciphertext)) as T;
  }
}

const record = {
  id: 'compatibility-001',
  createdAt: '2026-08-12T20:00:00.000Z',
  updatedAt: '2026-08-12T20:01:00.000Z',
  type: 'heart-rate',
  payload: { bpm: 72, unit: 'bpm' },
};

describe('backup and restore compatibility gate', () => {
  it('restores a legacy envelope through the current migration path', async () => {
    const crypto = new CompatibilityCryptoPipeline();
    const service = new BackupRecoveryService(crypto);
    const legacy: LegacyBackupEnvelope = {
      keyVersion: '1',
      payload: {
        ciphertext: btoa(JSON.stringify(record)),
        iv: 'legacy-iv',
        algorithm: 'AES-GCM',
        version: 1,
        keyVersion: 1,
      },
    };

    await expect(service.restoreBackup<typeof record>(legacy)).resolves.toEqual(record);
    expect(service.migrateEnvelope(legacy)).toMatchObject({ version: 2, keyVersion: '1', payload: legacy.payload });
  });

  it('restores a current envelope without changing its version or key version', async () => {
    const crypto = new CompatibilityCryptoPipeline();
    const service = new BackupRecoveryService(crypto);
    const current: BackupEnvelope = {
      version: 2,
      keyVersion: '3',
      createdAt: Date.now(),
      payload: {
        ciphertext: btoa(JSON.stringify(record)),
        iv: 'current-iv',
        algorithm: 'AES-GCM',
        version: 1,
        keyVersion: 3,
      },
    };

    await expect(service.restoreBackup<typeof record>(current)).resolves.toEqual(record);
    expect(service.migrateEnvelope(current)).toEqual(current);
  });

  it('rejects incompatible encrypted payload key versions before restore', async () => {
    const crypto = new CompatibilityCryptoPipeline();
    const service = new BackupRecoveryService(crypto);
    const incompatible: BackupEnvelope = {
      version: 2,
      keyVersion: '3',
      createdAt: Date.now(),
      payload: {
        ciphertext: btoa(JSON.stringify(record)),
        iv: 'invalid-iv',
        algorithm: 'AES-GCM',
        version: 1,
        keyVersion: 2,
      },
    };

    await expect(service.restoreBackup<typeof record>(incompatible))
      .rejects.toThrow('Backup key version does not match encrypted payload key version');
  });
});
