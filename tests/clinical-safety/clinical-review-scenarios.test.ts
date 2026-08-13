import { describe, expect, it } from "vitest";
import { assessRisk } from "../../src/risk-engine/riskEngine";

const scenarios = [
  ["CR-01", "I have severe chest pain."],
  ["CR-02", "Ich habe starke Brustschmerzen."],
  ["CR-03", "I suddenly cannot breathe."],
  ["CR-04", "Ich habe keine Atemnot."],
  ["CR-05", "I passed out and lost consciousness."],
  ["CR-06", "Plötzlich ist eine Seite meines Körpers schwach und ich habe eine Sprachstörung."],
  ["CR-07", "I have uncontrolled bleeding."],
  ["CR-08", "Ich hatte einen Krampfanfall."],
  ["CR-09", "I have a severe allergic reaction."],
  ["CR-10", "Ich habe starke Bauchschmerzen."],
  ["CR-11", "I have a fever."],
  ["CR-12", "Mir ist schwindelig."],
  ["CR-13", "My heart is racing and I feel dizzy."],
  ["CR-14", "Ich habe Fieber und mir ist schwindelig."],
  ["CR-15", "I have no chest pain, but I have severe breathing difficulty."],
  ["CR-16", "I have no dizziness, but my heart is racing."],
  ["CR-17", "I have a sudden severe headache."],
  ["CR-18", "Ich erbreche Blut."],
  ["CR-19", "My lips are blue."],
  ["CR-20", "I have severe confusion."],
  ["CR-21", "I have a serious eye injury."],
  ["CR-22", "Ich habe eine schwere Verbrennung."],
  ["CR-23", "I am severely hypothermic."],
  ["CR-24", "I have black tarry stool."],
  ["CR-25", "I am planning suicide."],
  ["CR-26", "I am not planning suicide, but I am thinking about hurting myself."],
  ["CR-27", "I nearly drowned."],
  ["CR-28", "I suffered an electric shock."],
  ["CR-29", "I have a major injury."],
  ["CR-30", "I suddenly lost my vision."],
  ["CR-31", "My face is severely swollen."],
  ["CR-32", "I have severe abdominal pain and vomiting blood."],
  ["CR-33", "I have fever, dizziness and palpitations."],
  ["CR-34", "I have no fever, but I feel dizzy."],
  ["CR-35", "I am tired and have no chest pain."],
  ["NEG-01", "I have no chest pain."],
  ["NEG-02", "I have no chest pain, but now I have severe chest pain."],
  ["NEG-03", "Keine Atemnot, aber jetzt starke Brustschmerzen."],
  ["NEG-04", "I do not have dizziness, but my heart is racing."],
  ["NEG-05", "I have no fever."],
] as const;

describe("independent clinical review scenario execution", () => {
  it("executes every blinded review scenario and emits only system-side results", () => {
    const results = scenarios.map(([id, symptom]) => ({
      id,
      input: symptom,
      systemResult: assessRisk({
        id,
        symptom,
        severity: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    }));

    expect(results).toHaveLength(40);
    expect(results.map((result) => result.id)).toEqual(scenarios.map(([id]) => id));
    for (const result of results) {
      expect(["info", "observation", "warning", "emergency"]).toContain(result.systemResult.level);
      expect(result.systemResult.engineVersion).toBeTruthy();
      expect(Array.isArray(result.systemResult.ruleIds)).toBe(true);
    }

    console.log(JSON.stringify(results, null, 2));
  });
});
