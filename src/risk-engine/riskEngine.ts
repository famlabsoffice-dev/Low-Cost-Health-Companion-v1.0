import { RISK_ENGINE_VERSION, riskRules } from "./rules";
import type { HealthEvent, RiskAssessment, RiskLevel } from "./types";

const NEGATION_PATTERN = /\b(no|without|not|none|denies|denied|kein|keine|keinen|ohne|nicht)\b/u;
const NEGATION_WINDOW = 24;
const CONTEXT_BOUNDARIES = /[.,;:\n!?]/gu;

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function findWholeKeywordOccurrences(text: string, keyword: string): number[] {
  const normalizedKeyword = normalize(keyword);
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "gu");
  return [...text.matchAll(pattern)].flatMap((match) =>
    match.index === undefined ? [] : [match.index],
  );
}

function hasNonNegatedOccurrence(text: string, keyword: string): boolean {
  const normalizedKeyword = normalize(keyword);

  for (const index of findWholeKeywordOccurrences(text, normalizedKeyword)) {
    const preceding = text.slice(Math.max(0, index - NEGATION_WINDOW), index);
    const boundaryIndex = [...preceding.matchAll(CONTEXT_BOUNDARIES)].reduce(
      (last, match) => Math.max(last, match.index ?? -1),
      -1,
    );
    const localContext = preceding.slice(boundaryIndex + 1);

    if (!NEGATION_PATTERN.test(localContext)) return true;
  }

  return false;
}

export function assessRisk(event: HealthEvent): RiskAssessment {
  const text = normalize(event.symptom);
  const matches = riskRules.filter((rule) =>
    rule.keywords.some((keyword) => hasNonNegatedOccurrence(text, keyword)),
  );
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
