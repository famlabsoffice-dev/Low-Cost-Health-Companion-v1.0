import { createCryptoPipeline } from "../storage/repository/storageServiceFactory";
import { EncryptedRepository } from "../security/storage/encryptedRepository";
import { MemorySecureStorage } from "../security/storage/secureStorage";
import { HealthRecordRepository } from "./healthRecordRepository";

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const secureStorage = new MemorySecureStorage();
  const cryptoPipeline = await createCryptoPipeline();

  const encryptedRepository = new EncryptedRepository(
    secureStorage,
    cryptoPipeline,
  );

  return new HealthRecordRepository(
    encryptedRepository,
  );
}
