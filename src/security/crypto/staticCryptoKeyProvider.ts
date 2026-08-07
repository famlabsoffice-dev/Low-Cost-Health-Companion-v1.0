import type { CryptoKeyProvider } from './cryptoTypes';

export class StaticCryptoKeyProvider implements CryptoKeyProvider {
  constructor(private readonly key: CryptoKey) {}

  async getKey(): Promise<CryptoKey> {
    return this.key;
  }
}
