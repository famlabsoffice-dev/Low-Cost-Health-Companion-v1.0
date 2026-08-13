import type { RiskCombinationRule } from "./types";

export const riskCombinationRules: RiskCombinationRule[] = [
  {
    id: "combination.dizziness-palpitations",
    version: "1.2.0",
    keyword: "dizziness with palpitations",
    requiredSignals: ["symptom.dizziness", "symptom.palpitations"],
    weight: 3,
    level: "warning",
    emergency: false,
  },
  {
    id: "combination.fever-dizziness",
    version: "1.2.0",
    keyword: "fever with dizziness",
    requiredSignals: ["symptom.fever", "symptom.dizziness"],
    weight: 2,
    level: "warning",
    emergency: false,
  },
];
