import type { HealthRecord } from "../domain/healthRecord";
import type { HealthRecordRepository } from "../domain/healthRecordRepository";
import { sortHealthTimeline, type HealthTimelineEntry } from "./healthTimeline";

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

  async list(): Promise<HealthTimelineEntry[]> {
    return sortHealthTimeline(await this.repository.list());
  }
}
