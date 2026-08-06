export type RiskLevel = "info" | "observation" | "warning" | "emergency";

export interface HealthEvent {
  id: string;
  symptom: string;
  severity: number;
  createdAt: string;
}

export interface RiskFactor {
  keyword: string;
  weight: number;
  level: RiskLevel;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
  emergency: boolean;
}
