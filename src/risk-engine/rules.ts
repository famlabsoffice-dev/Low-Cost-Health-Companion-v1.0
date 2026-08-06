import type { RiskFactor } from "./types";

export const riskRules: RiskFactor[] = [
  { keyword: "chest pain", weight: 10, level: "emergency" },
  { keyword: "unconscious", weight: 10, level: "emergency" },
  { keyword: "fever", weight: 3, level: "warning" },
  { keyword: "fatigue", weight: 1, level: "observation" },
];
