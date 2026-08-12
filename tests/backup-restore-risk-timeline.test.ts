import { describe, expect, test } from "vitest";
import { BackupRecoveryService } from "../src/security/backup/backupRecoveryService";
import { HealthDataFlow } from "../src/integration/healthDataFlow";
import { HealthTimelineRepository } from "../src/timeline/healthTimelineRepository";
import type { HealthRecord } from "../src/domain/healthRecord";
import type { HealthRecordRepository } from "../src/domain/healthRecordRepository";
import type { CryptoPipeline } from "../src/security/crypto/cryptoPipeline";

class InMemoryHealthRecordRepository implements HealthRecordRepository {
  private readonly records = new Map<string, HealthRecord>();

  async save(record: HealthRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<HealthRecord | null> {
    return this.records.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async list(): Promise<HealthRecord[]> {
    return [...this.records.values()];
  }

  async replaceAll(records: readonly HealthRecord[]): Promise<HealthRecord[]> {
    this.records.clear();
    for (const record of records) this.records.set(record.id, record);
    return [...records];
  }
}

test("backup restore preserves risk and timeline equivalence", async () => {
  const sourceRepository = new InMemoryHealthRecordRepository();
  const sourceTimeline = new HealthTimelineRepository(sourceRepository);
  const sourceFlow = new HealthDataFlow(sourceTimeline);
  const source = await sourceFlow.ingest({
    id: "restore-health-1",
    type: "symptom",
    value: { symptom: "chest pain", severity: 5 },
  }, 1_760_000_000_000);

  const encryptedPayload = {
    algorithm: "AES-GCM" as const,
    version: 1 as const,
    ciphertext: "ciphertext",
    iv: "iv",
    keyVersion: 1,
  };
  const crypto = {
    encryptPayload: async <T>(_data: T) => encryptedPayload,
    decryptPayload: async <T>(_payload: typeof encryptedPayload) => source.record as T,
  } as unknown as CryptoPipeline;

  const recovery = new BackupRecoveryService(crypto);
  const backup = await recovery.createBackup(source.record, "1");

  const restoredRepository = new InMemoryHealthRecordRepository();
  const restoredTimeline = new HealthTimelineRepository(restoredRepository);
  const restored = await recovery.restoreIntoStorage<HealthRecord>(
    backup,
    { resolve: async () => crypto },
    restoredRepository,
  );
  const restoredFlow = new HealthDataFlow(restoredTimeline);
  const timeline = await restoredFlow.timeline();

  expect(restored).toEqual(source.record);
  expect(timeline).toHaveLength(1);
  expect(timeline[0]?.record).toEqual(source.record);
  expect(source.risk).toEqual({
    level: "emergency",
    score: 7,
    reasons: ["chest pain"],
    emergency: true,
  });

  const reprocessed = await restoredFlow.assess(restored);
  expect(reprocessed).toEqual(source.risk);
});
