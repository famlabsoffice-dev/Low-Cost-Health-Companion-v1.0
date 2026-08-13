import { describe, expect, test } from "vitest";
import { assessRisk } from "../src/risk-engine/riskEngine";
import { RISK_ENGINE_VERSION, riskRules } from "../src/risk-engine/rules";

describe("Risk engine rule coverage", () => {
  test("covers every active rule with its canonical signal", () => {
    for (const rule of riskRules) {
      const result = assessRisk({
        id: `coverage-${rule.id}`,
        symptom: rule.keyword,
        severity: 0,
        createdAt: new Date(0).toISOString(),
      });
      expect(result.ruleIds).toEqual([rule.id]);
      expect(result.reasons).toEqual([rule.keyword]);
      expect(result.emergency).toBe(rule.emergency);
      expect(result.engineVersion).toBe(RISK_ENGINE_VERSION);
    }
  });

  test("covers every configured alias for every active rule", () => {
    for (const rule of riskRules) {
      for (const alias of rule.keywords) {
        const result = assessRisk({
          id: `alias-${rule.id}`,
          symptom: alias,
          severity: 0,
          createdAt: new Date(0).toISOString(),
        });
        expect(result.ruleIds).toContain(rule.id);
      }
    }
  });

  test("evaluates matching independently of symptom casing", () => {
    const result = assessRisk({ id: "coverage-case", symptom: "CHEST PAIN", severity: 0, createdAt: new Date(0).toISOString() });
    expect(result.level).toBe("emergency");
    expect(result.emergency).toBe(true);
    expect(result.ruleIds).toEqual(["symptom.chest-pain"]);
    expect(result.reasons).toEqual(["chest pain"]);
  });

  test("does not create a risk signal for an unsupported symptom", () => {
    expect(assessRisk({ id: "coverage-unsupported", symptom: "unlisted symptom", severity: 0, createdAt: new Date(0).toISOString() })).toEqual({ level: "info", score: 0, ruleIds: [], reasons: [], emergency: false, engineVersion: RISK_ENGINE_VERSION });
  });

  test("preserves severity as the base score", () => {
    const result = assessRisk({ id: "coverage-severity", symptom: "fatigue", severity: 4, createdAt: new Date(0).toISOString() });
    expect(result.score).toBe(5);
    expect(result.level).toBe("warning");
  });

  test.each(["no chest pain", "without chest pain", "not chest pain", "none chest pain", "denies chest pain", "denied chest pain", "kein Brustschmerz", "keine Brustschmerzen", "keinen Brustschmerz", "ohne Brustschmerz", "nicht Brustschmerz"])("does not trigger emergency for negated text: %s", (symptom) => {
    const result = assessRisk({ id: "coverage-negation", symptom, severity: 0, createdAt: new Date(0).toISOString() });
    expect(result.level).toBe("info");
    expect(result.emergency).toBe(false);
    expect(result.ruleIds).toEqual([]);
  });

  test("matches an unnegated occurrence after a negated occurrence", () => {
    const result = assessRisk({ id: "coverage-repeated-occurrence", symptom: "no chest pain; symptoms resolved; current chest pain", severity: 0, createdAt: new Date(0).toISOString() });
    expect(result.level).toBe("emergency");
    expect(result.emergency).toBe(true);
    expect(result.ruleIds).toEqual(["symptom.chest-pain"]);
  });

  test("is deterministic across repeated evaluation", () => {
    const event = { id: "coverage-determinism", symptom: "severe breathing difficulty with dizziness", severity: 1, createdAt: new Date(0).toISOString() };
    const first = assessRisk(event);
    for (let index = 0; index < 20; index += 1) expect(assessRisk(event)).toEqual(first);
  });
});
