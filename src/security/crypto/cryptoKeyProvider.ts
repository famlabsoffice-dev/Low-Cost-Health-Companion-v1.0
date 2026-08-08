import type { CryptoKeyProvider } from './cryptoTypes';

export class StaticCryptoKeyProvider implements CryptoKeyProvider {
  constructor(
    private readonly key: CryptoKey,
    private readonly keyVersion = 1,
  ) {}

  async getKey(): Promise<CryptoKey> {
    return this.key;
  }

  async getCurrentKeyVersion(): Promise<number> {
    return this.keyVersion;
  }
}
