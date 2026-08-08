import type { CryptoKeyProvider } from './cryptoTypes';
import { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

export class PersistentStorageCryptoKeyProvider implements CryptoKeyProvider {
  constructor(
    private readonly provider = new PersistentCryptoKeyProvider(),
    private readonly keyId = 'device-root-key',
  ) {}

  async getKey(): Promise<CryptoKey> {
    return this.provider.getOrCreate(this.keyId);
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
