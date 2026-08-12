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
});

test("presents emergency risk without diagnosing", () => {
  const presentation = presentRiskAssessment({
    level: "emergency",
    score: 15,
    reasons: ["chest pain"],
    emergency: true,
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
    reasons: ["fatigue"],
    emergency: false,
  });

  expect(presentation.level).toBe("observation");
  expect(presentation.action).toContain("Monitor");
  expect(presentation.disclaimer).toBe("This is a risk signal, not a diagnosis.");
});
