import { createHealthTimelineRepository } from "../domain/repositoryFactory";
import { HealthDataFlow, type HealthDataFlowResult } from "../integration/healthDataFlow";
import { presentRiskAssessment } from "../risk-engine/riskPresentation";
import type { HealthTimelineEntry } from "../timeline/healthTimeline";

let flowPromise: Promise<HealthDataFlow> | null = null;

async function getFlow(): Promise<HealthDataFlow> {
  if (!flowPromise) {
    flowPromise = createHealthTimelineRepository().then((timeline) => new HealthDataFlow(timeline));
  }
  return flowPromise;
}

export async function recordComplaint(
  symptom: string,
  severity: number,
  occurredAt?: number,
): Promise<{
  result: HealthDataFlowResult;
  presentation: ReturnType<typeof presentRiskAssessment> | null;
}> {
  const normalizedSymptom = symptom.trim();
  if (!normalizedSymptom) throw new Error("Beschwerde ist erforderlich.");
  if (!Number.isInteger(severity) || severity < 1 || severity > 10) {
    throw new Error("Die Beschwerdestärke muss zwischen 1 und 10 liegen.");
  }
  if (occurredAt !== undefined && !Number.isFinite(occurredAt)) {
    throw new Error("Der Zeitpunkt der Beschwerde ist ungültig.");
  }

  const result = await (await getFlow()).ingest({
    id: crypto.randomUUID(),
    type: "symptom",
    value: { symptom: normalizedSymptom, severity },
    occurredAt,
  });

  return {
    result,
    presentation: result.risk ? presentRiskAssessment(result.risk) : null,
  };
}

export async function loadTimeline(): Promise<HealthTimelineEntry[]> {
  return (await getFlow()).timeline({ type: "symptom", limit: 50 });
}
