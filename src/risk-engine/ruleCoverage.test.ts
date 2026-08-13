import { describe, expect, it } from "vitest";
import { assessRisk } from "./riskEngine";
import { RISK_ENGINE_VERSION, riskRules } from "./rules";

const REQUIRED_HIGH_SIGNAL_RULES = [
  "symptom.cardiac-arrest",
  "symptom.choking",
  "symptom.sudden-severe-headache",
  "symptom.vomiting-blood",
  "symptom.cyanosis",
  "symptom.severe-confusion",
  "symptom.severe-abdominal-pain",
  "symptom.severe-allergic-reaction",
  "symptom.severe-burn",
  "symptom.heat-stroke",
  "symptom.hypothermia",
  "symptom.black-tarry-stool",
  "symptom.suicidal-intent",
  "symptom.self-harm",
  "symptom.drowning",
  "symptom.electric-shock",
  "symptom.major-trauma",
  "symptom.sudden-vision-loss",
  "symptom.severe-eye-injury",
  "symptom.severe-facial-swelling",
] as const;

describe("risk engine rule coverage audit", () => {
  it("requires stable unique rule identity and valid rule metadata", () => {
    const ids = new Set(riskRules.map((rule) => rule.id));

    expect(ids.size).toBe(riskRules.length);
    expect(riskRules.every((rule) => rule.version.length > 0)).toBe(true);
    expect(riskRules.every((rule) => rule.keyword.length > 0)).toBe(true);
    expect(riskRules.every((rule) => rule.keywords.includes(rule.keyword))).toBe(true);
    expect(riskRules.every((rule) => Number.isFinite(rule.weight) && rule.weight > 0)).toBe(true);
    expect(riskRules.every((rule) => rule.emergency === (rule.level === "emergency"))).toBe(true);
  });

  it("retains the expanded v1.2 high-signal rule set", () => {
    const ids = new Set(riskRules.map((rule) => rule.id));

    for (const ruleId of REQUIRED_HIGH_SIGNAL_RULES) {
      expect(ids).toContain(ruleId);
    }
  });

  it("covers every configured alias with a deterministic positive match", () => {
    for (const rule of riskRules) {
      for (const keyword of rule.keywords) {
        const assessment = assessRisk({
          id: `coverage-${rule.id}-${keyword}`,
          symptom: keyword,
          severity: 0,
          createdAt: "2026-08-13T00:00:00.000Z",
        });

        expect(assessment.ruleIds).toContain(rule.id);
        expect(assessment.engineVersion).toBe(RISK_ENGINE_VERSION);
      }
    }
  });

  it("keeps every emergency rule behind an explicit emergency match", () => {
    const emergencyRules = riskRules.filter((rule) => rule.emergency);

    expect(emergencyRules.length).toBeGreaterThan(0);
    for (const rule of emergencyRules) {
      const assessment = assessRisk({
        id: `emergency-${rule.id}`,
        symptom: rule.keyword,
        severity: 0,
        createdAt: "2026-08-13T00:00:00.000Z",
      });

      expect(assessment.level).toBe("emergency");
      expect(assessment.emergency).toBe(true);
      expect(assessment.ruleIds).toContain(rule.id);
    }
  });

  it("does not match covered emergency signals when directly negated", () => {
    const emergencyRules = riskRules.filter((rule) => rule.emergency);

    for (const rule of emergencyRules) {
      const assessment = assessRisk({
        id: `negation-${rule.id}`,
        symptom: `no ${rule.keyword}`,
        severity: 0,
        createdAt: "2026-08-13T00:00:00.000Z",
      });

      expect(assessment.ruleIds).not.toContain(rule.id);
      expect(assessment.emergency).toBe(false);
    }
  });

  it("does not let a negated signal block a later positive occurrence", () => {
    const assessment = assessRisk({
      id: "mixed-negation",
      symptom: "no chest pain, now chest pain",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.ruleIds).toContain("symptom.chest-pain");
    expect(assessment.emergency).toBe(true);
  });

  it("does not match a signal embedded inside another word", () => {
    const assessment = assessRisk({
      id: "word-boundary",
      symptom: "the patient reports a feverish feeling but no fever",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.ruleIds).not.toContain("symptom.fever");
    expect(assessment.emergency).toBe(false);
  });

  it("resets negation scope at explicit sentence boundaries", () => {
    const assessment = assessRisk({
      id: "negation-boundary",
      symptom: "no chest pain. chest pain started now",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.ruleIds).toContain("symptom.chest-pain");
    expect(assessment.emergency).toBe(true);
  });

  it("produces no fabricated rule match for unsupported input", () => {
    const assessment = assessRisk({
      id: "unsupported-input",
      symptom: "routine wellness check without a reported symptom",
      severity: 0,
      createdAt: "2026-08-13T00:00:00.000Z",
    });

    expect(assessment.level).toBe("info");
    expect(assessment.score).toBe(0);
    expect(assessment.ruleIds).toEqual([]);
    expect(assessment.reasons).toEqual([]);
    expect(assessment.emergency).toBe(false);
    expect(assessment.engineVersion).toBe(RISK_ENGINE_VERSION);
  });

  it("is reproducible for identical input", () => {
    const event = {
      id: "deterministic-repeat",
      symptom: "sudden severe headache and dizziness",
      severity: 1,
      createdAt: "2026-08-13T00:00:00.000Z",
    };

    expect(assessRisk(event)).toEqual(assessRisk(event));
  });
});
