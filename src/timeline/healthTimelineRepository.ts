import type { HealthRecord } from "../domain/healthRecord";
import type { HealthRecordRepository } from "../domain/healthRecordRepository";
import { queryHealthTimeline, type HealthTimelineEntry, type HealthTimelineQuery } from "./healthTimeline";

export class HealthTimelineRepository {
  constructor(private readonly repository: HealthRecordRepository) {}

  save(record: HealthRecord): Promise<void> {
    return this.repository.save(record);
  }

  get(id: string): Promise<HealthRecord | null> {
    return this.repository.get(id);
  }

  remove(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async list(query: HealthTimelineQuery = {}): Promise<HealthTimelineEntry[]> {
    return queryHealthTimeline(await this.repository.list(), query);
  }
}
