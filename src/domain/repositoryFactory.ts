import { createHealthRecordStorageRepository } from "../storage/repository/storageServiceFactory";
import { HealthTimelineRepository } from "../timeline/healthTimelineRepository";
import { HealthRecordRepository } from "./healthRecordRepository";

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const repository = await createHealthRecordStorageRepository();
  return new HealthRecordRepository(repository);
}

export async function createHealthTimelineRepository(): Promise<HealthTimelineRepository> {
  return new HealthTimelineRepository(await createHealthRecordRepository());
}
