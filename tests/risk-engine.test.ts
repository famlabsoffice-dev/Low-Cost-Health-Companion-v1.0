import { expect, test } from "vitest";
import { assessRisk } from "../src/risk-engine/riskEngine";
import { presentRiskAssessment } from "../src/risk-engine/riskPresentation";

test("detects emergency symptoms offline", () => {
  const result = assessRisk({
    id: "1",
    symptom: "chest pain",
    severity: 5,
    createdAt: new Date().toISOString(),
  });

  expect(result.emergency).toBe(true);
  expect(result.level).toBe("emergency");
  expect(result.ruleIds).toEqual(["symptom.chest-pain"]);
  expect(result.engineVersion).toBe("1.1.0");
});

test("does not match a negated emergency symptom", () => {
  const result = assessRisk({
    id: "2",
    symptom: "no chest pain",
    severity: 0,
    createdAt: new Date().toISOString(),
  });

  expect(result).toEqual({
    level: "info",
    score: 0,
    ruleIds: [],
    reasons: [],
    emergency: false,
    engineVersion: "1.1.0",
  });
});

test("presents emergency risk without diagnosing", () => {
  const presentation = presentRiskAssessment({
    level: "emergency",
    score: 15,
    ruleIds: ["symptom.chest-pain"],
    reasons: ["chest pain"],
    emergency: true,
    engineVersion: "1.1.0",
  });

  expect(presentation.title).toBe("Potential emergency risk");
  expect(presentation.message).toContain("may require urgent medical attention");
  expect(presentation.action).toContain("immediate medical care");
  expect(presentation.disclaimer).toBe("This is a risk signal, not a diagnosis.");
});

test("presents non-emergency risk levels with explicit monitoring guidance", () => {
  const presentation = presentRiskAssessment({
    level: "observation",
    score: 2,
    ruleIds: ["symptom.fatigue"],
    reasons: ["fatigue"],
    emergency: false,
    engineVersion: "1.1.0",
  });

  expect(presentation.level).toBe("observation");
  expect(presentation.action).toContain("Monitor");
  expect(presentation.disclaimer).toBe("This is a risk signal, not a diagnosis.");
});
