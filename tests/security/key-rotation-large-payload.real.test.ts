import { describe, expect, it } from 'vitest';

import { BackupRecoveryService } from '../../src/security/backup/backupRecoveryService';
import { DefaultCryptoPipeline } from '../../src/security/crypto/cryptoPipeline';
import { StaticCryptoKeyProvider } from '../../src/security/crypto/staticCryptoKeyProvider';
import { WebCryptoEngine } from '../../src/security/crypto/webCryptoEngine';

const MB = 1024 * 1024;
const PAYLOAD_BYTES = 80 * MB;
const MIN_BACKUP_BYTES = 100 * MB;

async function createPipeline(): Promise<DefaultCryptoPipeline> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return new DefaultCryptoPipeline(new WebCryptoEngine(new StaticCryptoKeyProvider(key)));
}

describe('large backup key rotation', () => {
  it('re-encrypts a backup larger than 100 MiB with real AES-GCM and measures throughput', async () => {
    const oldPipeline = await createPipeline();
    const nextPipeline = await createPipeline();
    const service = new BackupRecoveryService(nextPipeline);
    const payload = 'health-record-'.repeat(Math.ceil(PAYLOAD_BYTES / 14)).slice(0, PAYLOAD_BYTES);
    const source = await service.createBackup(payload, 'v1');
    const sourceCiphertextBytes = Math.floor(source.payload.ciphertext.length * 3 / 4);

    expect(payload.length).toBe(PAYLOAD_BYTES);
    expect(sourceCiphertextBytes).toBeGreaterThan(MIN_BACKUP_BYTES);

    const start = performance.now();
    const rotated = await service.reEncryptBackup<string>(
      source,
      { resolve: async () => oldPipeline },
      'v2',
    );
    const elapsedMs = performance.now() - start;
    const throughputMiBPerSecond = PAYLOAD_BYTES / MB / (elapsedMs / 1000);
    const rotatedCiphertextBytes = Math.floor(rotated.payload.ciphertext.length * 3 / 4);
    const restored = await nextPipeline.decryptPayload<string>(rotated.payload);

    expect(rotated.keyVersion).toBe('v2');
    expect(rotatedCiphertextBytes).toBeGreaterThan(MIN_BACKUP_BYTES);
    expect(restored).toBe(payload);
    expect(rotated.payload.ciphertext).not.toBe(source.payload.ciphertext);
    expect(elapsedMs).toBeGreaterThan(0);
    expect(Number.isFinite(throughputMiBPerSecond)).toBe(true);

    console.info(JSON.stringify({
      payloadMiB: PAYLOAD_BYTES / MB,
      sourceBackupMiB: Number((sourceCiphertextBytes / MB).toFixed(2)),
      rotatedBackupMiB: Number((rotatedCiphertextBytes / MB).toFixed(2)),
      rotationMilliseconds: Number(elapsedMs.toFixed(2)),
      rotationMiBPerSecond: Number(throughputMiBPerSecond.toFixed(2)),
    }));
  }, 120000);
});
