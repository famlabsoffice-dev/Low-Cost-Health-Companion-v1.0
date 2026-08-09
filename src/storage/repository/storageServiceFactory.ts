import {
  DefaultCryptoPipeline,
  type CryptoPipeline,
} from "../../security/crypto/cryptoPipeline";
import { PersistentStorageCryptoKeyProvider } from "../../security/crypto/persistentCryptoKeyProvider";
import { WebCryptoEngine } from "../../security/crypto/webCryptoEngine";
import { SecureStorage } from "../secureStorage";
import { IndexedDbRepository } from "../indexedDbRepository";
import { migratedHealthRecordSchema, type MigratedHealthRecord } from "./migrationSchema";
import { CleartextToEncryptedStorageMigration } from "./storageMigration";
import { versionedStorageSchema } from "../schemas/storageSchemas";
import { IndexedDbStorageRepository } from "./storageRepository";

export async function createCryptoPipeline(): Promise<CryptoPipeline> {
  const engine = new WebCryptoEngine(
    new PersistentStorageCryptoKeyProvider(),
  );

  return new DefaultCryptoPipeline(engine);
}

export async function createHealthRecordStorageRepository(): Promise<IndexedDbStorageRepository<MigratedHealthRecord>> {
  const cryptoPipeline = await createCryptoPipeline();
  const legacyRepository = new IndexedDbRepository();
  const repository = new IndexedDbStorageRepository<MigratedHealthRecord>(
    migratedHealthRecordSchema,
    cryptoPipeline,
  );

  await new CleartextToEncryptedStorageMigration(
    legacyRepository,
    repository,
  ).migrate();

  return repository;
}

export async function createStorageService(
  namespace: string,
  cryptoPipeline: CryptoPipeline,
) {
  const repository = new IndexedDbStorageRepository(
    versionedStorageSchema,
    cryptoPipeline,
  );

  return new SecureStorage(
    repository,
    namespace,
  );
}
