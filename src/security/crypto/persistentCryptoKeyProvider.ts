import type { CryptoKeyProvider } from './cryptoTypes';
import { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

export class PersistentStorageCryptoKeyProvider implements CryptoKeyProvider {
  constructor(
    private readonly provider = new PersistentCryptoKeyProvider(),
    private readonly keyId = 'device-root-key',
  ) {}

  async getKey(version?: number): Promise<CryptoKey> {
    if (version === undefined) return this.provider.getOrCreate(this.keyId);
    return this.provider.getVersion(this.keyId, version);
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

  async remove(): Promise<void> {
    await this.provider.remove(this.keyId);
  }
}
