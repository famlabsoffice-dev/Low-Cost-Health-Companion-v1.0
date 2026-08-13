import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { riskCombinationRules, riskRules } from "../src/risk-engine/rules";

const SPEC_PATH = resolve(process.cwd(), "docs/RISK-ENGINE-SPEC.md");

type SpecRule = {
  id: string;
  keyword: string;
  keywords: string[];
  weight: number;
  level: string;
  emergency: boolean;
};

type SpecCombinationRule = {
  id: string;
  requiredSignals: string[];
  weight: number;
  level: string;
  emergency: boolean;
};

function parseSpecTables(): { rules: SpecRule[]; combinations: SpecCombinationRule[] } {
  const source = readFileSync(SPEC_PATH, "utf8");
  const activeRules = source
    .split("## Active Rule Set v1.2.0", 2)[1]
    ?.split("## Deterministic Coverage Extension v1.2.0", 2)[0];
  const combinationRules = source
    .split("### Deterministic Combination Rules v1.2.0", 2)[1]
    ?.split("Combination rules require", 2)[0];

  if (!activeRules) throw new Error("Active Rule Set v1.2.0 section missing");
  if (!combinationRules) throw new Error("Deterministic Combination Rules v1.2.0 section missing");

  const rules = activeRules
    .split("\n")
    .filter((line) => line.startsWith("| `symptom."))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      const [id, keyword, aliases, weight, level, emergency] = cells;
      const canonical = keyword.replaceAll("`", "").toLowerCase();
      return {
        id: id.replaceAll("`", ""),
        keyword: canonical,
        keywords: [canonical, ...aliases.split(",").map((alias) => alias.trim().toLowerCase())].filter(Boolean),
        weight: Number(weight),
        level,
        emergency: emergency === "yes",
      };
    });

  const combinations = combinationRules
    .split("\n")
    .filter((line) => line.startsWith("| `combination."))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      const [id, requiredSignals, weight, level, emergency] = cells;
      return {
        id: id.replaceAll("`", ""),
        requiredSignals: requiredSignals.split("+").map((signal) => signal.replaceAll("`", "").trim()),
        weight: Number(weight),
        level,
        emergency: emergency === "yes",
      };
    });

  return { rules, combinations };
}

describe("risk engine specification conformance", () => {
  it("matches every active specification symptom rule exactly", () => {
    const expected = parseSpecTables().rules;
    const actual = riskRules.map((rule) => ({
      id: rule.id,
      keyword: rule.keyword.toLowerCase(),
      keywords: rule.keywords.map((keyword) => keyword.toLowerCase()),
      weight: rule.weight,
      level: rule.level,
      emergency: rule.emergency,
    }));

    expect(actual).toEqual(expected);
  });

  it("matches every specification combination rule exactly", () => {
    const expected = parseSpecTables().combinations;
    const actual = riskCombinationRules.map((rule) => ({
      id: rule.id,
      requiredSignals: [...rule.requiredSignals],
      weight: rule.weight,
      level: rule.level,
      emergency: rule.emergency,
    }));

    expect(actual).toEqual(expected);
  });

  it("contains no unknown or duplicate symptom rule IDs", () => {
    const { rules: expected } = parseSpecTables();
    const expectedIds = new Set(expected.map((rule) => rule.id));
    const actualIds = riskRules.map((rule) => rule.id);

    expect(new Set(actualIds).size).toBe(actualIds.length);
    expect(actualIds.every((id) => expectedIds.has(id))).toBe(true);
    expect(expected.every((rule) => actualIds.includes(rule.id))).toBe(true);
  });

  it("contains no unknown or duplicate combination rule IDs", () => {
    const { combinations: expected } = parseSpecTables();
    const expectedIds = new Set(expected.map((rule) => rule.id));
    const actualIds = riskCombinationRules.map((rule) => rule.id);

    expect(new Set(actualIds).size).toBe(actualIds.length);
    expect(actualIds.every((id) => expectedIds.has(id))).toBe(true);
    expect(expected.every((rule) => actualIds.includes(rule.id))).toBe(true);
  });

  it("contains no duplicate aliases within or across symptom rules", () => {
    const aliases = riskRules.flatMap((rule) => rule.keywords.map((keyword) => keyword.toLowerCase()));
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it("requires every combination signal to reference an existing symptom rule", () => {
    const symptomIds = new Set(riskRules.map((rule) => rule.id));
    for (const rule of riskCombinationRules) {
      expect(rule.requiredSignals.length).toBeGreaterThan(0);
      expect(rule.requiredSignals.every((signal) => symptomIds.has(signal))).toBe(true);
    }
  });
});
