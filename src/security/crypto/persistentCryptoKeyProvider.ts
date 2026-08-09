import type { CryptoKeyProvider } from './cryptoTypes';
import { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

export class PersistentStorageCryptoKeyProvider implements CryptoKeyProvider {
  constructor(
    private readonly provider = new PersistentCryptoKeyProvider(),
    private readonly keyId = 'device-root-key',
  ) {}

  async initialize(): Promise<void> {
    await this.provider.getOrCreate(this.keyId);
  }

  async getKey(version?: number): Promise<CryptoKey> {
    const resolvedVersion = version ?? await this.getCurrentKeyVersion();
    return this.provider.getVersion(this.keyId, resolvedVersion);
  }

  async getCurrentKeyVersion(): Promise<number> {
    return this.provider.getCurrentVersion(this.keyId);
  }

  async rotate(): Promise<CryptoKey> {
    return this.provider.rotate(this.keyId);
  }

  async exportKey(): Promise<JsonWebKey> {
    return this.provider.exportKey(this.keyId);
  }

  async exportKeyVersion(version: number): Promise<JsonWebKey> {
    return this.provider.exportKeyVersion(this.keyId, version);
  }

  async importKeyVersion(key: JsonWebKey, version: number): Promise<CryptoKey> {
    return this.provider.importKeyForVersion(this.keyId, key, version);
  }

  async retireVersion(version: number): Promise<void> {
    await this.provider.retireVersion(this.keyId, version);
  }

  async remove(): Promise<void> {
    await this.provider.remove(this.keyId);
  }
}
