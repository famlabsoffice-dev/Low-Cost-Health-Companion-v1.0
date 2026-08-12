import type { HealthRecord } from "../domain/healthRecord";
import type { HealthRecordRepository } from "../domain/healthRecordRepository";
import { sortHealthTimeline } from "./healthTimeline";

export class HealthTimelineRepository {
  constructor(private readonly repository: HealthRecordRepository) {}

  async save(record: HealthRecord): Promise<void> {
    await this.repository.save(record);
  }

  async get(id: string): Promise<HealthRecord | null> {
    return this.repository.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async list(): Promise<HealthRecord[]> {
    const records: HealthRecord[] = [];
    for (const id of await this.ids()) {
      const record = await this.repository.get(id);
      if (record) records.push(record);
    }
    return sortHealthTimeline(records);
  }

  private async ids(): Promise<string[]> {
    const repository = this.repository as unknown as {
      repository?: { listAll?: () => Promise<Array<{ id: string }>> };
    };
    const values = await repository.repository?.listAll?.();
    return values?.map((value) => value.id) ?? [];
  }
}
