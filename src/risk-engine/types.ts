export type RiskLevel = "info" | "observation" | "warning" | "emergency";

export interface HealthEvent {
  id: string;
  symptom: string;
  severity: number;
  createdAt: string;
}

export interface RiskFactor {
  id: string;
  version: string;
  keyword: string;
  weight: number;
  level: RiskLevel;
  emergency: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  ruleIds: string[];
  reasons: string[];
  emergency: boolean;
  engineVersion: string;
}

export interface RiskPresentation {
  level: RiskLevel;
  title: string;
  message: string;
  action: string;
  reasons: string[];
  disclaimer: string;
}
