import { RISK_ENGINE_VERSION, riskRules } from "./rules";
import type { HealthEvent, RiskAssessment, RiskLevel } from "./types";

const NEGATION_PATTERN = /\b(no|without|not|none|denies|denied|kein|keine|keinen|ohne|nicht)\b/;

function isNegated(text: string, keyword: string): boolean {
  const index = text.indexOf(keyword);
  if (index < 0) return false;
  const preceding = text.slice(Math.max(0, index - 24), index);
  return NEGATION_PATTERN.test(preceding);
}

export function assessRisk(event: HealthEvent): RiskAssessment {
  const text = event.symptom.trim().toLowerCase();
  const matches = riskRules.filter((rule) => text.includes(rule.keyword) && !isNegated(text, rule.keyword));
  const score = matches.reduce((sum, rule) => sum + rule.weight, event.severity);

  let level: RiskLevel = "info";
  if (matches.some((rule) => rule.emergency)) level = "emergency";
  else if (score >= 5) level = "warning";
  else if (score > 1) level = "observation";

  return {
    level,
    score,
    ruleIds: matches.map((rule) => rule.id),
    reasons: matches.map((rule) => rule.keyword),
    emergency: level === "emergency",
    engineVersion: RISK_ENGINE_VERSION,
  };
}
