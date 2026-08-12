import { createHealthRecordStorageRepository } from "../storage/repository/storageServiceFactory";
import { HealthInputService } from "../input/healthInputService";
import { HealthTimelineRepository } from "../timeline/healthTimelineRepository";
import { HealthRecordRepository } from "./healthRecordRepository";

export async function createHealthRecordRepository(): Promise<HealthRecordRepository> {
  const repository = await createHealthRecordStorageRepository();
  return new HealthRecordRepository(repository);
}

export async function createHealthTimelineRepository(): Promise<HealthTimelineRepository> {
  return new HealthTimelineRepository(await createHealthRecordRepository());
}

export async function createHealthInputService(): Promise<HealthInputService> {
  return new HealthInputService(await createHealthTimelineRepository());
}
