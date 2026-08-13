import { describe, expect, it } from "vitest";
import { assessRisk } from "../src/risk-engine/riskEngine";
import { riskCombinationRules } from "../src/risk-engine/rules";

describe("risk engine deterministic combination coverage", () => {
  it("declares unique, fully referenced combination rules", () => {
    const ids = riskCombinationRules.map((rule) => rule.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(riskCombinationRules.every((rule) => rule.requiredSignals.length >= 2)).toBe(true);
    expect(riskCombinationRules.every((rule) => rule.version.length > 0)).toBe(true);
    expect(riskCombinationRules.every((rule) => Number.isFinite(rule.weight) && rule.weight > 0)).toBe(true);
  });

  it("raises dizziness plus palpitations to warning", () => {
    const assessment = assessRisk({
      id: "combination-dizziness-palpitations",
      symptom: "dizziness and palpitations",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.level).toBe("warning");
    expect(assessment.ruleIds).toContain("combination.dizziness-palpitations");
    expect(assessment.score).toBe(7);
    expect(assessment.emergency).toBe(false);
  });

  it("raises fever plus dizziness to warning", () => {
    const assessment = assessRisk({
      id: "combination-fever-dizziness",
      symptom: "fever and dizziness",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.level).toBe("warning");
    expect(assessment.ruleIds).toContain("combination.fever-dizziness");
    expect(assessment.score).toBe(7);
    expect(assessment.emergency).toBe(false);
  });

  it("does not trigger a combination when one component is negated", () => {
    const assessment = assessRisk({
      id: "combination-negation",
      symptom: "no dizziness and palpitations",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.ruleIds).not.toContain("combination.dizziness-palpitations");
  });

  it("detects a later positive component after an earlier negated component", () => {
    const assessment = assessRisk({
      id: "combination-later-positive",
      symptom: "no dizziness, dizziness and palpitations",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.ruleIds).toContain("combination.dizziness-palpitations");
    expect(assessment.level).toBe("warning");
  });
});
