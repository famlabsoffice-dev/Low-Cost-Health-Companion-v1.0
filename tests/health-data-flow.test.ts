import { describe, expect, test } from "vitest";
import { HealthDataFlow } from "../src/integration/healthDataFlow";
import type { HealthRecord } from "../src/domain/healthRecord";
import type { HealthRecordRepository } from "../src/domain/healthRecordRepository";
import { HealthTimelineRepository } from "../src/timeline/healthTimelineRepository";

class InMemoryHealthRecordRepository implements HealthRecordRepository {
  private readonly records = new Map<string, HealthRecord>();
  async save(record: HealthRecord): Promise<void> { this.records.set(record.id, record); }
  async get(id: string): Promise<HealthRecord | null> { return this.records.get(id) ?? null; }
  async delete(id: string): Promise<void> { this.records.delete(id); }
  async list(): Promise<HealthRecord[]> { return [...this.records.values()]; }
}

describe("HealthDataFlow", () => {
  test("persists input, assesses risk, and exposes the record through the timeline", async () => {
    const repository = new InMemoryHealthRecordRepository();
    const timeline = new HealthTimelineRepository(repository);
    const flow = new HealthDataFlow(timeline);
    const result = await flow.ingest({ id: "health-1", type: "symptom", value: { symptom: "chest pain", severity: 5 } }, 1_760_000_000_000);

    expect(result.record.id).toBe("health-1");
    expect(result.risk).toEqual({ level: "emergency", score: 15, reasons: ["chest pain"], emergency: true });
    const entries = await flow.timeline();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("health-1");
  });

  test("normalizes persisted identity and risk symptom before assessment", async () => {
    const repository = new InMemoryHealthRecordRepository();
    const timeline = new HealthTimelineRepository(repository);
    const flow = new HealthDataFlow(timeline);
    const result = await flow.ingest(
      { id: "  health-3  ", type: " symptom ", value: { symptom: "  chest pain  ", severity: 5 } },
      1_760_000_000_000,
    );

    expect(result.record.id).toBe("health-3");
    expect(result.record.type).toBe("symptom");
    expect(result.risk).toEqual({ level: "emergency", score: 15, reasons: ["chest pain"], emergency: true });
  });

  test("persists non-risk health input without fabricating an assessment", async () => {
    const repository = new InMemoryHealthRecordRepository();
    const timeline = new HealthTimelineRepository(repository);
    const flow = new HealthDataFlow(timeline);
    const result = await flow.ingest({ id: "health-2", type: "measurement", value: 72 });
    expect(result.risk).toBeNull();
    expect(await repository.get("health-2")).toEqual(result.record);
    expect(await flow.timeline()).toHaveLength(1);
  });
});
