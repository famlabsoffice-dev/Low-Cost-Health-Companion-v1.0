import type { CryptoEngine, EncryptedPayload } from './cryptoTypes';

export interface CryptoPipeline {
  encryptPayload<T>(payload: T): Promise<EncryptedPayload>;
  decryptPayload<T>(payload: EncryptedPayload): Promise<T>;
}

export class DefaultCryptoPipeline implements CryptoPipeline {
  constructor(private readonly engine: CryptoEngine) {}

  encryptPayload<T>(payload: T) {
    return this.engine.encrypt(JSON.stringify(payload));
  }

  async decryptPayload<T>(payload: EncryptedPayload): Promise<T> {
    return JSON.parse(await this.engine.decrypt(payload)) as T;
  }
}
