import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { riskRules } from "../src/risk-engine/rules";

const SPEC_PATH = resolve(process.cwd(), "docs/RISK-ENGINE-SPEC.md");

function parseSpecRules(): Array<{
  id: string;
  keyword: string;
  keywords: string[];
  weight: number;
  level: string;
  emergency: boolean;
}> {
  const source = readFileSync(SPEC_PATH, "utf8");
  const table = source
    .split("## Active Rule Set v1.2.0", 2)[1]
    ?.split("## Deterministic Coverage Extension v1.2.0", 2)[0];

  if (!table) throw new Error("Active Rule Set v1.2.0 section missing");

  return table
    .split("\n")
    .filter((line) => line.startsWith("| `symptom."))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      const [id, keyword, aliases, weight, level, emergency] = cells;
      return {
        id: id.replaceAll("`", ""),
        keyword: keyword.replaceAll("`", ""),
        keywords: [keyword.replaceAll("`", ""), ...aliases.split(",").map((alias) => alias.trim())].filter(Boolean).map((value) => value.toLowerCase()),
        weight: Number(weight),
        level,
        emergency: emergency === "yes",
      };
    });
}

describe("risk engine specification conformance", () => {
  it("matches every active specification rule exactly", () => {
    const expected = parseSpecRules();
    const actual = riskRules.map((rule) => ({
      id: rule.id,
      keyword: rule.keyword,
      keywords: rule.keywords.map((keyword) => keyword.toLowerCase()),
      weight: rule.weight,
      level: rule.level,
      emergency: rule.emergency,
    }));

    expect(actual).toEqual(expected);
  });

  it("contains no duplicate aliases within a rule", () => {
    for (const rule of riskRules) {
      const normalized = rule.keywords.map((keyword) => keyword.toLowerCase());
      expect(new Set(normalized).size).toBe(normalized.length);
    }
  });

  it("contains no duplicate rule IDs", () => {
    const ids = riskRules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
