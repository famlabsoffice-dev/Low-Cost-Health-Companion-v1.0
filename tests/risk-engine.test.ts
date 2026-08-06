import { assessRisk } from "../src/risk-engine/riskEngine";

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
