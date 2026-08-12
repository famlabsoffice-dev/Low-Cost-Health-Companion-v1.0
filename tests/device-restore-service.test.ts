import { describe, expect, test } from 'vitest';
import { DeviceRestoreService, type DeviceKeyRecoveryPackage } from '../src/security/keys/deviceRestoreService';

class FakeKeyProvider {
  private readonly keys = new Map<number, JsonWebKey>();
  private current = 1;

  async getCurrentVersion(): Promise<number> {
    await this.ensureKey(1);
    return this.current;
  }

  async exportKeyVersion(_id: string, version: number): Promise<JsonWebKey> {
    const key = await this.ensureKey(version);
    return key;
  }

  async importKeyForVersion(_id: string, key: JsonWebKey, version: number): Promise<CryptoKey> {
    this.keys.set(version, key);
    this.current = Math.max(this.current, version);
    return crypto.subtle.importKey('jwk', key, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  private async ensureKey(version: number): Promise<JsonWebKey> {
    const existing = this.keys.get(version);
    if (existing) return existing;
    const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('jwk', generated);
    this.keys.set(version, exported);
    return exported;
  }
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
