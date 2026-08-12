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

export interface RiskPresentation {
  level: RiskLevel;
  title: string;
  message: string;
  action: string;
  reasons: string[];
  disclaimer: string;
}
