import type { CryptoKeyProvider } from './cryptoTypes';
import { PersistentCryptoKeyProvider } from '../keys/persistentCryptoKeyProvider';

export class PersistentStorageCryptoKeyProvider implements CryptoKeyProvider {
  constructor(
    private readonly provider = new PersistentCryptoKeyProvider(),
  ) {}

  async getKey(): Promise<CryptoKey> {
    return this.provider.getOrCreate();
  }
}
