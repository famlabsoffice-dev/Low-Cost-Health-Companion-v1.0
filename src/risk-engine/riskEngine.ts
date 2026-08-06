import { riskRules } from "./rules";
import type { HealthEvent, RiskAssessment, RiskLevel } from "./types";

export function assessRisk(event: HealthEvent): RiskAssessment {
  const text = event.symptom.toLowerCase();
  const matches = riskRules.filter((rule) => text.includes(rule.keyword));
  const score = matches.reduce((sum, rule) => sum + rule.weight, event.severity);

  let level: RiskLevel = "info";
  if (matches.some((rule) => rule.level === "emergency")) level = "emergency";
  else if (score >= 5) level = "warning";
  else if (score > 1) level = "observation";

  return {
    level,
    score,
    reasons: matches.map((rule) => rule.keyword),
    emergency: level === "emergency",
  };
}
