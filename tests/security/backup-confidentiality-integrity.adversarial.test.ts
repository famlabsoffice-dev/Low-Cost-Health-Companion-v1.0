import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DefaultCryptoPipeline } from '../../src/security/crypto/cryptoPipeline';
import { WebCryptoEngine } from '../../src/security/crypto/webCryptoEngine';
import { PersistentCryptoKeyProvider } from '../../src/security/keys/persistentCryptoKeyProvider';
import { IndexedDbCryptoKeyStore } from '../../src/security/keys/persistentCryptoKeyProvider';
import { BackupRecoveryService, type BackupEnvelope } from '../../src/security/backup/backupRecoveryService';

describe('encrypted backup confidentiality and integrity adversarial tests', () => {
  async function createFixture() {
    const keyProvider = new PersistentCryptoKeyProvider(
      new IndexedDbCryptoKeyStore(`backup-adversarial-${crypto.randomUUID()}`),
    );
    await keyProvider.getOrCreate();
    const cryptoPipeline = new DefaultCryptoPipeline(new WebCryptoEngine({
      getKey: (version) => keyProvider.getVersion('device-root-key', version ?? 1),
      getCurrentKeyVersion: () => keyProvider.getCurrentVersion(),
    }));
    return { keyProvider, cryptoPipeline, recovery: new BackupRecoveryService(cryptoPipeline) };
  }

  it('does not expose plaintext in the encrypted backup ciphertext', async () => {
    const { recovery } = await createFixture();
    const secret = 'CONFIDENTIAL-HEALTH-DATA-9f8a7b6c';
    const backup = await recovery.createBackup({ note: secret, bpm: 72 }, '1');

    expect(backup.payload.ciphertext).not.toContain(secret);
    expect(backup.payload.ciphertext).not.toContain('CONFIDENTIAL');
    expect(backup.payload.algorithm).toBe('AES-GCM');
    expect(backup.payload.iv).not.toHaveLength(0);
  });

  it('rejects ciphertext tampering', async () => {
    const { recovery } = await createFixture();
    const backup = await recovery.createBackup({ note: 'private-health-record', bpm: 72 }, '1');
    const bytes = Uint8Array.from(atob(backup.payload.ciphertext), (char) => char.charCodeAt(0));
    bytes[0] ^= 0x01;
    const tampered: BackupEnvelope = {
      ...backup,
      payload: { ...backup.payload, ciphertext: btoa(String.fromCharCode(...bytes)) },
    };

    await expect(recovery.restoreBackup(tampered)).rejects.toThrow();
  });

  it('rejects IV tampering', async () => {
    const { recovery } = await createFixture();
    const backup = await recovery.createBackup({ note: 'private-health-record', bpm: 72 }, '1');
    const iv = Uint8Array.from(atob(backup.payload.iv), (char) => char.charCodeAt(0));
    iv[0] ^= 0x01;
    const tampered: BackupEnvelope = {
      ...backup,
      payload: { ...backup.payload, iv: btoa(String.fromCharCode(...iv)) },
    };

    await expect(recovery.restoreBackup(tampered)).rejects.toThrow();
  });

  it('rejects key-version mismatch before decryption', async () => {
    const { recovery } = await createFixture();
    const backup = await recovery.createBackup({ note: 'private-health-record', bpm: 72 }, '1');
    const tampered: BackupEnvelope = {
      ...backup,
      keyVersion: '2',
    };

    await expect(recovery.restoreBackup(tampered)).rejects.toThrow(
      'Backup key version does not match encrypted payload key version',
    );
  });

  it('rejects malformed encrypted payload metadata', async () => {
    const { recovery } = await createFixture();
    const backup = await recovery.createBackup({ note: 'private-health-record', bpm: 72 }, '1');
    const tampered: BackupEnvelope = {
      ...backup,
      payload: { ...backup.payload, algorithm: 'AES-CBC' as 'AES-GCM' },
    };

    await expect(recovery.restoreBackup(tampered)).rejects.toThrow('Invalid encrypted backup payload');
  });
});
