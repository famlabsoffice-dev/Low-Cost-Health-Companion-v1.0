import { describe, expect, test } from "vitest";
import { assessRisk } from "../src/risk-engine/riskEngine";

describe("Risk engine rule coverage", () => {
  test.each([
    ["chest pain", "emergency", true],
    ["unconscious", "emergency", true],
    ["fever", "warning", false],
    ["fatigue", "observation", false],
  ])("classifies the supported rule %s", (symptom, level, emergency) => {
    const result = assessRisk({
      id: `coverage-${symptom.replace(/\\s+/g, "-")}`,
      symptom,
      severity: 0,
      createdAt: new Date(0).toISOString(),
    });

    expect(result.level).toBe(level);
    expect(result.emergency).toBe(emergency);
    expect(result.reasons).toContain(symptom);
  });

  test("evaluates matching independently of symptom casing", () => {
    const result = assessRisk({
      id: "coverage-case",
      symptom: "CHEST PAIN",
      severity: 0,
      createdAt: new Date(0).toISOString(),
    });

    expect(result.level).toBe("emergency");
    expect(result.emergency).toBe(true);
    expect(result.reasons).toEqual(["chest pain"]);
  });

  test("does not create a risk signal for an unsupported symptom", () => {
    const result = assessRisk({
      id: "coverage-unsupported",
      symptom: "unlisted symptom",
      severity: 0,
      createdAt: new Date(0).toISOString(),
    });

    expect(result).toEqual({
      level: "info",
      score: 0,
      reasons: [],
      emergency: false,
    });
  });

  test("preserves severity as the base score", () => {
    const result = assessRisk({
      id: "coverage-severity",
      symptom: "fatigue",
      severity: 4,
      createdAt: new Date(0).toISOString(),
    });

    expect(result.score).toBe(5);
    expect(result.level).toBe("warning");
  });
});
