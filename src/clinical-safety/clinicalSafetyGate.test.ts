import { describe, expect, it } from "vitest";
import { assessRisk } from "../risk-engine/riskEngine";
import { riskRules } from "../risk-engine/rules";

const FORBIDDEN_DIAGNOSIS_TERMS = /\b(diagnosis|diagnose|diagnosed|you have|you suffer from|confirmed disease|diagnostic conclusion)\b/i;
const EMERGENCY_ACTION_TERMS = /\b(call|contact|seek|emergency|ambulance|immediately|sofort|notruf|rettungsdienst|ärztlich|medical)\b/i;

describe("clinical safety gate", () => {
  it("keeps rule definitions separate from user-facing risk logic", () => {
    expect(riskRules.every((rule) => typeof rule.id === "string" && typeof rule.keyword === "string" && typeof rule.level === "string")).toBe(true);
    expect(riskRules.some((rule) => Object.prototype.hasOwnProperty.call(rule, "diagnosis"))).toBe(false);
    expect(riskRules.some((rule) => Object.prototype.hasOwnProperty.call(rule, "diagnosisStatement"))).toBe(false);
  });

  it("does not expose diagnosis language in deterministic reasons", () => {
    for (const rule of riskRules) {
      const assessment = assessRisk({ id: `safety-${rule.id}`, symptom: rule.keyword, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.reasons.some((reason) => FORBIDDEN_DIAGNOSIS_TERMS.test(reason))).toBe(false);
    }
  });

  it("keeps emergency outputs actionable rather than diagnostic", () => {
    for (const rule of riskRules.filter((candidate) => candidate.emergency)) {
      const assessment = assessRisk({ id: `emergency-safety-${rule.id}`, symptom: rule.keyword, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.emergency).toBe(true);
      expect(assessment.reasons.length).toBeGreaterThan(0);
      expect(assessment.reasons.every((reason) => !FORBIDDEN_DIAGNOSIS_TERMS.test(reason))).toBe(true);
      expect(assessment.reasons.some((reason) => EMERGENCY_ACTION_TERMS.test(reason))).toBe(true);
    }
  });

  it("does not escalate uncertainty from unsupported input into emergency output", () => {
    const assessment = assessRisk({ id: "uncertain-safety", symptom: "something feels unusual and I am not sure what it is", severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
    expect(assessment.emergency).toBe(false);
    expect(assessment.level).toBe("info");
    expect(assessment.score).toBe(0);
    expect(assessment.ruleIds).toEqual([]);
  });

  it("preserves emergency semantics after a positive-after-negation boundary", () => {
    for (const rule of riskRules.filter((candidate) => candidate.emergency)) {
      const assessment = assessRisk({ id: `positive-after-negation-safety-${rule.id}`, symptom: `no ${rule.keyword}. ${rule.keyword}`, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.emergency).toBe(true);
      expect(assessment.ruleIds).toContain(rule.id);
      expect(assessment.reasons.some((reason) => FORBIDDEN_DIAGNOSIS_TERMS.test(reason))).toBe(false);
    }
  });
});
