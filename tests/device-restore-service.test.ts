import { describe, expect, test } from 'vitest';
import { DeviceRestoreService, type DeviceKeyRecoveryPackage } from '../src/security/keys/deviceRestoreService';

class FakeKeyProvider {
  private readonly keys = new Map<number, JsonWebKey>();
  private current = 1;
  constructor() { this.keys.set(1, { kty: 'oct', k: 'AQEBAQEBAQEBAQEBAQEBAQ', alg: 'A256GCM', ext: true }); }
  async getCurrentVersion(): Promise<number> { return this.current; }
  async exportKeyVersion(_id: string, version: number): Promise<JsonWebKey> { const key = this.keys.get(version); if (!key) throw new Error('missing'); return key; }
  async importKeyForVersion(_id: string, key: JsonWebKey, version: number): Promise<CryptoKey> { this.keys.set(version, key); this.current = Math.max(this.current, version); return crypto.subtle.importKey('jwk', key, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']); }
}

describe('DeviceRestoreService', () => {
  test('exports and restores a versioned recovery package', async () => {
    const provider = new FakeKeyProvider();
    const service = new DeviceRestoreService(provider as never);
    const pkg = await service.createRecoveryPackage();
    expect(pkg.format).toBe('low-cost-health-companion.device-key-recovery');
    expect(pkg.keyVersion).toBe(1);
    await expect(service.restoreFromRecoveryPackage(pkg)).resolves.toBeDefined();
  });

  test('rejects a package targeting another key id', async () => {
    const provider = new FakeKeyProvider();
    const service = new DeviceRestoreService(provider as never);
    const pkg = await service.createRecoveryPackage();
    const invalid: DeviceKeyRecoveryPackage = { ...pkg, keyId: 'other-device' };
    await expect(service.restoreFromRecoveryPackage(invalid)).rejects.toThrow('target mismatch');
  });

  test('rejects malformed recovery keys', async () => {
    const provider = new FakeKeyProvider();
    const service = new DeviceRestoreService(provider as never);
    const pkg = await service.createRecoveryPackage();
    const invalid: DeviceKeyRecoveryPackage = { ...pkg, key: { kty: 'RSA', n: 'invalid' } };
    await expect(service.restoreFromRecoveryPackage(invalid)).rejects.toThrow('Invalid device key recovery key');
  });
});
