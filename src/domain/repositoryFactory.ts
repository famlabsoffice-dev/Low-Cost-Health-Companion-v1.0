import { createCryptoPipeline, createStorageService } from "../storage/repository/storageServiceFactory";
import { EncryptedRepository } from "../security/storage/encryptedRepository";
import { HealthRecordRepository } from "./healthRecordRepository";

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const cryptoPipeline = await createCryptoPipeline();
  const secureStorage = await createStorageService("health_records", cryptoPipeline);
  const encryptedRepository = new EncryptedRepository(
    secureStorage,
    cryptoPipeline,
  );

  return new HealthRecordRepository(encryptedRepository);
}
