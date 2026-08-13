import type { RiskFactor } from "./types";

export const RISK_ENGINE_VERSION = "1.1.0";

export const riskRules: RiskFactor[] = [
  { id: "symptom.chest-pain", version: "1.0.0", keyword: "chest pain", weight: 10, level: "emergency", emergency: true },
  { id: "symptom.unconscious", version: "1.0.0", keyword: "unconscious", weight: 10, level: "emergency", emergency: true },
  { id: "symptom.fever", version: "1.0.0", keyword: "fever", weight: 3, level: "warning", emergency: false },
  { id: "symptom.fatigue", version: "1.0.0", keyword: "fatigue", weight: 1, level: "observation", emergency: false },
];
