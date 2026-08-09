import { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';
import type { PersistentKeyRecoveryStorageAdapter } from './backupTypes';

export class PersistentCryptoKeyRecoveryAdapter implements PersistentKeyRecoveryStorageAdapter {
  constructor(
    private readonly provider = new PersistentCryptoKeyProvider(),
    private readonly keyId = 'device-root-key',
  ) {}

  async save(keyVersion: string, key: JsonWebKey): Promise<void> {
    const version = parseKeyVersion(keyVersion);
    await this.provider.importKeyForVersion(this.keyId, key, version);
  }

  async load(keyVersion: string): Promise<JsonWebKey | undefined> {
    const version = parseKeyVersion(keyVersion);
    try {
      const key = await this.provider.getVersion(this.keyId, version);
      return await crypto.subtle.exportKey('jwk', key);
    } catch (error) {
      if (error instanceof Error && error.message === `Crypto key version was not found: ${this.keyId}:${version}`) {
        return undefined;
      }
      throw error;
    }
  }

  async remove(keyVersion: string): Promise<void> {
    const version = parseKeyVersion(keyVersion);
    const currentVersion = await this.provider.getCurrentVersion(this.keyId);
    if (currentVersion !== version) {
      throw new Error(`Cannot remove non-current crypto key version: ${this.keyId}:${version}`);
    }
    await this.provider.remove(this.keyId);
  }

  async importCryptoKey(keyVersion: string): Promise<CryptoKey> {
    return this.provider.getVersion(this.keyId, parseKeyVersion(keyVersion));
  }

  async saveCryptoKey(keyVersion: string, key: CryptoKey): Promise<void> {
    const jwk = await crypto.subtle.exportKey('jwk', key);
    await this.save(keyVersion, jwk);
  }
}

function parseKeyVersion(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`Invalid crypto key version: ${value}`);
  }
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(`Invalid crypto key version: ${value}`);
  }
  return version;
}
