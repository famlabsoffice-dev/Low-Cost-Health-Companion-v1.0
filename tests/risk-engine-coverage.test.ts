import { describe, expect, test } from "vitest";
import { assessRisk } from "../src/risk-engine/riskEngine";

describe("Risk engine rule coverage", () => {
  test.each([
    ["chest pain", "emergency", true, "symptom.chest-pain"],
    ["unconscious", "emergency", true, "symptom.unconscious"],
    ["fever", "observation", false, "symptom.fever"],
    ["fatigue", "info", false, "symptom.fatigue"],
  ])("classifies the supported rule %s", (symptom, level, emergency, ruleId) => {
    const result = assessRisk({ id: `coverage-${symptom.replace(/\s+/g, "-")}`, symptom, severity: 0, createdAt: new Date(0).toISOString() });
    expect(result.level).toBe(level);
    expect(result.emergency).toBe(emergency);
    expect(result.ruleIds).toEqual([ruleId]);
    expect(result.reasons).toContain(symptom);
    expect(result.engineVersion).toBe("1.1.0");
  });

  test("evaluates matching independently of symptom casing", () => {
    const result = assessRisk({ id: "coverage-case", symptom: "CHEST PAIN", severity: 0, createdAt: new Date(0).toISOString() });
    expect(result.level).toBe("emergency");
    expect(result.emergency).toBe(true);
    expect(result.ruleIds).toEqual(["symptom.chest-pain"]);
    expect(result.reasons).toEqual(["chest pain"]);
  });

  test("does not create a risk signal for an unsupported symptom", () => {
    expect(assessRisk({ id: "coverage-unsupported", symptom: "unlisted symptom", severity: 0, createdAt: new Date(0).toISOString() })).toEqual({
      level: "info", score: 0, ruleIds: [], reasons: [], emergency: false, engineVersion: "1.1.0",
    });
  });

  test("preserves severity as the base score", () => {
    const result = assessRisk({ id: "coverage-severity", symptom: "fatigue", severity: 4, createdAt: new Date(0).toISOString() });
    expect(result.score).toBe(5);
    expect(result.level).toBe("warning");
  });

  test.each(["no chest pain", "without chest pain", "keine Brustschmerzen"])("does not trigger emergency for negated text: %s", (symptom) => {
    const result = assessRisk({ id: "coverage-negation", symptom, severity: 0, createdAt: new Date(0).toISOString() });
    expect(result.level).toBe("info");
    expect(result.emergency).toBe(false);
    expect(result.ruleIds).toEqual([]);
  });
});
