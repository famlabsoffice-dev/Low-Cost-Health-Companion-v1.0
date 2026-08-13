import { describe, expect, it } from "vitest";
import { assessRisk } from "../src/risk-engine/riskEngine";
import { riskCombinationRules, riskRules } from "../src/risk-engine/rules";

const event = (symptom: string) => ({
  id: "coverage-test",
  symptom,
  severity: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("risk engine rule breadth", () => {
  it("positively matches every configured alias", () => {
    for (const rule of riskRules) {
      for (const alias of rule.keywords) {
        const assessment = assessRisk(event(alias));
        expect(assessment.ruleIds, `${rule.id}: ${alias}`).toContain(rule.id);
      }
    }
  });

  it("preserves emergency boundaries for every emergency rule", () => {
    for (const rule of riskRules.filter((candidate) => candidate.emergency)) {
      for (const alias of rule.keywords) {
        const assessment = assessRisk(event(`not ${alias}`));
        expect(assessment.ruleIds, `${rule.id}: ${alias}`).not.toContain(rule.id);
        expect(assessment.emergency, `${rule.id}: ${alias}`).toBe(false);
      }
    }
  });

  it("detects a later positive occurrence after a negated occurrence", () => {
    for (const rule of riskRules) {
      const alias = rule.keywords[0];
      const assessment = assessRisk(event(`not ${alias}. ${alias}`));
      expect(assessment.ruleIds, rule.id).toContain(rule.id);
    }
  });

  it("enforces whole-signal boundaries for every alias", () => {
    for (const rule of riskRules) {
      for (const alias of rule.keywords) {
        const assessment = assessRisk(event(`prefix_${alias}_suffix`));
        expect(assessment.ruleIds, `${rule.id}: ${alias}`).not.toContain(rule.id);
      }
    }
  });

  it("matches every configured combination only when all required signals are positive", () => {
    for (const combination of riskCombinationRules) {
      const aliases = combination.requiredSignals.map((signalId) => {
        const rule = riskRules.find((candidate) => candidate.id === signalId);
        expect(rule, signalId).toBeDefined();
        return rule!.keywords[0];
      });
      const positive = assessRisk(event(aliases.join(" and ")));
      expect(positive.ruleIds, combination.id).toContain(combination.id);

      for (const negatedSignal of aliases) {
        const remaining = aliases.filter((alias) => alias !== negatedSignal);
        const negative = assessRisk(event([`not ${negatedSignal}`, ...remaining].join(" and ")));
        expect(negative.ruleIds, combination.id).not.toContain(combination.id);
      }
    }
  });
});
