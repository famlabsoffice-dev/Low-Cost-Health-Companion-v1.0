import { describe, expect, it } from "vitest";
import { assessRisk } from "./riskEngine";
import { riskCombinationRules } from "./combinations";
import { RISK_ENGINE_VERSION, riskRules } from "./rules";

const REQUIRED_HIGH_SIGNAL_RULES = [
  "symptom.cardiac-arrest", "symptom.choking", "symptom.sudden-severe-headache", "symptom.vomiting-blood", "symptom.cyanosis", "symptom.severe-confusion", "symptom.severe-abdominal-pain", "symptom.severe-allergic-reaction", "symptom.severe-burn", "symptom.heat-stroke", "symptom.hypothermia", "symptom.black-tarry-stool", "symptom.suicidal-intent", "symptom.self-harm", "symptom.drowning", "symptom.electric-shock", "symptom.major-trauma", "symptom.sudden-vision-loss", "symptom.severe-eye-injury", "symptom.severe-facial-swelling",
] as const;

const SUPPORTED_NEGATIONS = ["no", "without", "not", "none", "denies", "denied", "kein", "keine", "keinen", "ohne", "nicht"] as const;
const BOUNDARIES = [".", ",", ";", ":", "\n", "!", "?"] as const;

describe("risk engine rule coverage audit", () => {
  it("requires complete unique rule metadata and finite aliases", () => {
    const ids = new Set(riskRules.map((rule) => rule.id));
    const aliases = riskRules.flatMap((rule) => rule.keywords.map((keyword) => keyword.toLocaleLowerCase("en-US")));
    expect(ids.size).toBe(riskRules.length);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(riskRules.every((rule) => rule.version.length > 0)).toBe(true);
    expect(riskRules.every((rule) => rule.keyword.length > 0)).toBe(true);
    expect(riskRules.every((rule) => rule.keywords.length > 0 && rule.keywords.includes(rule.keyword))).toBe(true);
    expect(riskRules.every((rule) => Number.isFinite(rule.weight) && rule.weight > 0)).toBe(true);
    expect(riskRules.every((rule) => rule.emergency === (rule.level === "emergency"))).toBe(true);
  });

  it("requires unique valid deterministic combination metadata", () => {
    const ids = new Set(riskCombinationRules.map((rule) => rule.id));
    const signalIds = new Set(riskRules.map((rule) => rule.id));
    const aliases = riskCombinationRules.map((rule) => rule.keyword.trim().toLocaleLowerCase("en-US"));
    expect(ids.size).toBe(riskCombinationRules.length);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(riskCombinationRules.every((rule) => rule.version.length > 0)).toBe(true);
    expect(riskCombinationRules.every((rule) => rule.keyword.length > 0)).toBe(true);
    expect(riskCombinationRules.every((rule) => rule.requiredSignals.length >= 2)).toBe(true);
    expect(riskCombinationRules.every((rule) => rule.requiredSignals.every((id) => signalIds.has(id)))).toBe(true);
    expect(riskCombinationRules.every((rule) => Number.isFinite(rule.weight) && rule.weight > 0)).toBe(true);
  });

  it("retains the expanded v1.2 high-signal rule set", () => {
    const ids = new Set(riskRules.map((rule) => rule.id));
    for (const ruleId of REQUIRED_HIGH_SIGNAL_RULES) expect(ids).toContain(ruleId);
  });

  it("covers every configured alias with deterministic positive matching", () => {
    for (const rule of riskRules) for (const keyword of rule.keywords) {
      const assessment = assessRisk({ id: `coverage-${rule.id}-${keyword}`, symptom: keyword, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.ruleIds).toContain(rule.id);
      expect(assessment.engineVersion).toBe(RISK_ENGINE_VERSION);
    }
  });

  it("rejects every supported negation immediately before every configured alias", () => {
    for (const rule of riskRules) for (const keyword of rule.keywords) for (const negation of SUPPORTED_NEGATIONS) {
      const assessment = assessRisk({ id: `negated-${rule.id}-${negation}-${keyword}`, symptom: `${negation} ${keyword}`, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.ruleIds).not.toContain(rule.id);
      expect(assessment.emergency).toBe(false);
    }
  });

  it("detects every emergency rule after every supported negation boundary", () => {
    for (const rule of riskRules.filter((candidate) => candidate.emergency)) for (const negation of SUPPORTED_NEGATIONS) {
      const assessment = assessRisk({ id: `positive-after-negation-${rule.id}-${negation}`, symptom: `${negation} ${rule.keyword}. ${rule.keyword}`, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.ruleIds).toContain(rule.id);
      expect(assessment.emergency).toBe(true);
    }
  });

  it("resets negation scope at every supported punctuation boundary", () => {
    const rule = riskRules.find((candidate) => candidate.id === "symptom.chest-pain");
    expect(rule).toBeDefined();
    for (const boundary of BOUNDARIES) {
      const assessment = assessRisk({ id: `boundary-${JSON.stringify(boundary)}`, symptom: `no ${rule?.keyword}${boundary}${rule?.keyword}`, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.ruleIds).toContain("symptom.chest-pain");
      expect(assessment.emergency).toBe(true);
    }
  });

  it("does not match aliases embedded in Unicode letter, number, or underscore sequences", () => {
    for (const rule of riskRules) {
      const assessment = assessRisk({ id: `boundary-${rule.id}`, symptom: `x${rule.keyword}x x_${rule.keyword} x${rule.keyword}2`, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.ruleIds).not.toContain(rule.id);
    }
  });

  it("matches every configured combination only when all required signals are positive", () => {
    for (const rule of riskCombinationRules) {
      const signals = rule.requiredSignals.map((id) => riskRules.find((candidate) => candidate.id === id));
      expect(signals.every(Boolean)).toBe(true);
      const symptom = signals.map((signal) => signal?.keyword).join(" and ");
      const assessment = assessRisk({ id: `combination-${rule.id}`, symptom, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
      expect(assessment.ruleIds).toContain(rule.id);
      expect(assessment.level).toBe("warning");
    }
  });

  it("blocks every combination when each required component is partially negated", () => {
    for (const rule of riskCombinationRules) {
      const signals = rule.requiredSignals.map((id) => riskRules.find((candidate) => candidate.id === id));
      expect(signals.every(Boolean)).toBe(true);
      for (const negatedIndex of rule.requiredSignals.map((_, index) => index)) {
        const symptom = signals.map((signal, index) => index === negatedIndex ? `no ${signal?.keyword}` : signal?.keyword).join(" and ");
        const assessment = assessRisk({ id: `combination-partial-negation-${rule.id}-${negatedIndex}`, symptom, severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
        expect(assessment.ruleIds).not.toContain(rule.id);
      }
    }
  });

  it("allows a later positive combination component after a negated occurrence", () => {
    const assessment = assessRisk({ id: "combination-boundary", symptom: "no dizziness. dizziness and palpitations", severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
    expect(assessment.ruleIds).toContain("combination.dizziness-palpitations");
  });

  it("does not match a signal embedded inside another word", () => {
    const assessment = assessRisk({ id: "word-boundary", symptom: "the patient reports a feverish feeling but no fever", severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
    expect(assessment.ruleIds).not.toContain("symptom.fever");
    expect(assessment.emergency).toBe(false);
  });

  it("produces no fabricated rule match for unsupported input", () => {
    const assessment = assessRisk({ id: "unsupported-input", symptom: "routine wellness check without a reported symptom", severity: 0, createdAt: "2026-08-13T00:00:00.000Z" });
    expect(assessment.level).toBe("info");
    expect(assessment.score).toBe(0);
    expect(assessment.ruleIds).toEqual([]);
    expect(assessment.reasons).toEqual([]);
    expect(assessment.emergency).toBe(false);
    expect(assessment.engineVersion).toBe(RISK_ENGINE_VERSION);
  });

  it("is reproducible for identical input", () => {
    const event = { id: "deterministic-repeat", symptom: "sudden severe headache and dizziness", severity: 1, createdAt: "2026-08-13T00:00:00.000Z" };
    expect(assessRisk(event)).toEqual(assessRisk(event));
  });
});
