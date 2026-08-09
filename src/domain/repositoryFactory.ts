import { createCryptoPipeline } from "../storage/repository/storageServiceFactory";
import { EncryptedRepository } from "../security/storage/encryptedRepository";
import { IndexedDbSecureStorage } from "../security/storage/indexedDbSecureStorage";
import { HealthRecordRepository } from "./healthRecordRepository";

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const cryptoPipeline = await createCryptoPipeline();
  const secureStorage = new IndexedDbSecureStorage();
  const encryptedRepository = new EncryptedRepository(
    secureStorage,
    cryptoPipeline,
  );

  return new HealthRecordRepository(encryptedRepository);
}
