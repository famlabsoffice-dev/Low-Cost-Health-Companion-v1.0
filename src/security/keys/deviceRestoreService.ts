import { PersistentCryptoKeyProvider } from './persistentCryptoKeyProvider';

export interface DeviceKeyRecoveryPackage {
  readonly format: 'low-cost-health-companion.device-key-recovery';
  readonly version: 1;
  readonly keyId: string;
  readonly keyVersion: number;
  readonly algorithm: 'AES-GCM';
  readonly key: JsonWebKey;
}

export class DeviceRestoreService {
  constructor(
    private readonly keyProvider: PersistentCryptoKeyProvider = new PersistentCryptoKeyProvider(),
    private readonly keyId = 'device-root-key',
  ) {}

  async createRecoveryPackage(version?: number): Promise<DeviceKeyRecoveryPackage> {
    const keyVersion = version ?? await this.keyProvider.getCurrentVersion(this.keyId);
    const key = await this.keyProvider.exportKeyVersion(this.keyId, keyVersion);
    return { format: 'low-cost-health-companion.device-key-recovery', version: 1, keyId: this.keyId, keyVersion, algorithm: 'AES-GCM', key };
  }

  async restoreFromRecoveryPackage(pkg: DeviceKeyRecoveryPackage): Promise<CryptoKey> {
    validateRecoveryPackage(pkg, this.keyId);
    return this.keyProvider.importKeyForVersion(this.keyId, pkg.key, pkg.keyVersion);
  }
}

function validateRecoveryPackage(pkg: DeviceKeyRecoveryPackage, expectedKeyId: string): void {
  if (!pkg || pkg.format !== 'low-cost-health-companion.device-key-recovery' || pkg.version !== 1) throw new Error('Invalid device key recovery package');
  if (pkg.keyId !== expectedKeyId) throw new Error(`Device key recovery target mismatch: ${pkg.keyId}`);
  if (!Number.isSafeInteger(pkg.keyVersion) || pkg.keyVersion < 1) throw new Error(`Invalid device key recovery version: ${pkg.keyVersion}`);
  if (pkg.algorithm !== 'AES-GCM') throw new Error(`Unsupported device key recovery algorithm: ${pkg.algorithm}`);
  if (!pkg.key || pkg.key.kty !== 'oct' || typeof pkg.key.k !== 'string' || pkg.key.k.length === 0) throw new Error('Invalid device key recovery key');
}
