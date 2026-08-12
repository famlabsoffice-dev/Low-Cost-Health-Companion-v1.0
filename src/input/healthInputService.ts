import type { HealthRecord } from "../domain/healthRecord";
import type { HealthTimelineRepository } from "../timeline/healthTimelineRepository";
import { createHealthRecord, type HealthInput } from "./healthInput";

export class HealthInputService {
  constructor(private readonly timeline: HealthTimelineRepository) {}

  async ingest(input: HealthInput, now = Date.now()): Promise<HealthRecord> {
    const record = createHealthRecord(input, now);
    await this.timeline.save(record);
    return record;
  }
}
