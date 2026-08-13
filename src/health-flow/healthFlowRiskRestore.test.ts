import { describe, expect, it } from "vitest";
import { assessRisk } from "../risk-engine/riskEngine";

type HealthEvent = {
  id: string;
  symptom: string;
  severity: number;
  createdAt: string;
};

type PersistedRecord = HealthEvent & { encryptedPayload: string };

const serialize = (value: HealthEvent): string => JSON.stringify(value);
const encryptForTest = (value: string): string => Buffer.from(value, "utf8").toString("base64");
const decryptForTest = (value: string): string => Buffer.from(value, "base64").toString("utf8");
const persist = (event: HealthEvent): PersistedRecord => ({ ...event, encryptedPayload: encryptForTest(serialize(event)) });
const restore = (record: PersistedRecord): HealthEvent => JSON.parse(decryptForTest(record.encryptedPayload)) as HealthEvent;

const semanticRisk = (event: HealthEvent) => {
  const result = assessRisk(event);
  return { engineVersion: result.engineVersion, level: result.level, score: result.score, ruleIds: [...result.ruleIds].sort(), emergency: result.emergency, reasons: [...result.reasons].sort() };
};

describe("end-to-end health flow risk semantic equivalence", () => {
  it("preserves Risk Engine semantics across input, persistence, backup, restore and decrypt", () => {
    const input: HealthEvent = {
      id: "health-flow-001",
      symptom: "sudden severe headache and dizziness",
      severity: 2,
      createdAt: "2026-08-13T00:00:00.000Z",
    };

    const beforePersistence = semanticRisk(input);
    const persisted = persist(input);
    const backup = JSON.stringify(persisted);
    const restoredRecord = JSON.parse(backup) as PersistedRecord;
    const restored = restore(restoredRecord);
    const afterRestore = semanticRisk(restored);

    expect(restored).toEqual(input);
    expect(afterRestore).toEqual(beforePersistence);
  });

  it("preserves emergency semantics through the complete flow", () => {
    const input: HealthEvent = {
      id: "health-flow-emergency-001",
      symptom: "no chest pain. chest pain",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    };

    const persisted = persist(input);
    const restored = restore(JSON.parse(JSON.stringify(persisted)) as PersistedRecord);
    expect(semanticRisk(restored)).toEqual(semanticRisk(input));
    expect(semanticRisk(restored).emergency).toBe(true);
  });

  it("preserves conservative no-signal semantics through restore", () => {
    const input: HealthEvent = {
      id: "health-flow-uncertain-001",
      symptom: "uncertain general discomfort without a recognized symptom",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    };

    const restored = restore(JSON.parse(JSON.stringify(persist(input))) as PersistedRecord);
    expect(semanticRisk(restored)).toEqual(semanticRisk(input));
    expect(semanticRisk(restored).emergency).toBe(false);
    expect(semanticRisk(restored).score).toBe(0);
  });
});
