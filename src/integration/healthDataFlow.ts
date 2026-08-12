import type { HealthRecord } from "../domain/healthRecord";
import type { HealthInput } from "../input/healthInput";
import { HealthInputService } from "../input/healthInputService";
import { assessRisk } from "../risk-engine/riskEngine";
import type { RiskAssessment } from "../risk-engine/types";
import type { HealthTimelineRepository } from "../timeline/healthTimelineRepository";

export interface HealthDataFlowResult {
  record: HealthRecord;
  risk: RiskAssessment | null;
}

interface RiskInput {
  symptom: string;
  severity: number;
}

function toRiskInput(input: HealthInput): RiskInput | null {
  if (typeof input.value !== "object" || input.value === null) return null;
  const value = input.value as Record<string, unknown>;
  if (typeof value.symptom !== "string" || !Number.isFinite(value.severity)) return null;
  return { symptom: value.symptom, severity: value.severity };
}

export class HealthDataFlow {
  private readonly input: HealthInputService;

  constructor(private readonly timelineRepository: HealthTimelineRepository) {
    this.input = new HealthInputService(timelineRepository);
  }

  async ingest(input: HealthInput, now = Date.now()): Promise<HealthDataFlowResult> {
    const record = await this.input.ingest(input, now);
    const riskInput = toRiskInput(input);
    const risk = riskInput
      ? assessRisk({ id: record.id, ...riskInput, createdAt: new Date(record.createdAt).toISOString() })
      : null;
    return { record, risk };
  }

  timeline(query: Parameters<HealthTimelineRepository["list"]>[0] = {}) {
    return this.timelineRepository.list(query);
  }
}
