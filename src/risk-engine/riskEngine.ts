import { RISK_ENGINE_VERSION, riskRules } from "./rules";
import type { HealthEvent, RiskAssessment, RiskLevel } from "./types";

const NEGATION_PATTERN = /\b(no|without|not|none|denies|denied|kein|keine|keinen|ohne|nicht)\b/;
const NEGATION_WINDOW = 24;
const NEGATION_BOUNDARIES = /[.,;:\n!?]/;

function hasNonNegatedOccurrence(text: string, keyword: string): boolean {
  let searchStart = 0;
  while (searchStart < text.length) {
    const index = text.indexOf(keyword, searchStart);
    if (index < 0) return false;

    const preceding = text.slice(Math.max(0, index - NEGATION_WINDOW), index);
    const boundaryIndex = [...preceding.matchAll(NEGATION_BOUNDARIES)].reduce(
      (last, match) => Math.max(last, match.index ?? -1),
      -1,
    );
    const localContext = preceding.slice(boundaryIndex + 1);

    if (!NEGATION_PATTERN.test(localContext)) return true;
    searchStart = index + keyword.length;
  }
  return false;
}

export function assessRisk(event: HealthEvent): RiskAssessment {
  const text = event.symptom.trim().toLowerCase();
  const matches = riskRules.filter((rule) => rule.keywords.some((keyword) => hasNonNegatedOccurrence(text, keyword)));
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
