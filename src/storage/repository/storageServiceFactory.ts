import {
  DefaultCryptoPipeline,
  type CryptoPipeline,
} from "../../security/crypto/cryptoPipeline";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { SecureStorage } from "../secureStorage";
import { versionedStorageSchema } from "../schemas/storageSchemas";
import { IndexedDbStorageRepository } from "./storageRepository";

export async function createCryptoPipeline(): Promise<CryptoPipeline> {
  const engine = new WebCryptoEngine(
    new PersistentStorageCryptoKeyProvider(),
  );

  return new DefaultCryptoPipeline(engine);
}

export async function createStorageService(
  namespace = "health_companion",
  cryptoPipeline?: CryptoPipeline,
) {
  const pipeline = cryptoPipeline ?? await createCryptoPipeline();

  const repository = new IndexedDbStorageRepository(
    versionedStorageSchema,
    pipeline,
  );

  return new SecureStorage(
    repository,
    namespace,
  );
}
