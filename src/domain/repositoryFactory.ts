import { createHealthRecordStorageRepository } from "../storage/repository/storageServiceFactory";
import { HealthRecordRepository } from "./healthRecordRepository";

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const repository = await createHealthRecordStorageRepository();
  return new HealthRecordRepository(repository);
}
