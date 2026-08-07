import { DefaultCryptoPipeline, type CryptoPipeline } from "../../security/crypto/cryptoPipeline";
import { StaticCryptoKeyProvider } from "../../security/crypto/staticCryptoKeyProvider";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { IndexedDbStorageRepository } from "./storageRepository";
import { SecureStorage } from "../secureStorage";
import { versionedStorageSchema } from "../schemas/storageSchemas";

async function createCryptoPipeline(): Promise<CryptoPipeline> {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const engine = new WebCryptoEngine(new StaticCryptoKeyProvider(key));

  return new DefaultCryptoPipeline(engine);
}

export async function createStorageService(
  namespace = "health_companion",
  cryptoPipeline?: CryptoPipeline,
) {
  const pipeline = cryptoPipeline ?? (await createCryptoPipeline());
  const repository = new IndexedDbStorageRepository(
    versionedStorageSchema,
    pipeline,
  );

  return new SecureStorage(repository, namespace);
}
