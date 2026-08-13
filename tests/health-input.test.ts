import { describe, expect, test } from "vitest";
import { createHealthRecord } from "../src/input/healthInput";

describe("createHealthRecord", () => {
  test("trims required identity fields before persistence", () => {
    const record = createHealthRecord(
      {
        id: "  health-1  ",
        type: " symptom ",
        value: { symptom: "chest pain", severity: 5 },
        occurredAt: 1_760_000_000_000,
      },
      1_760_000_001_000,
    );

    expect(record.id).toBe("health-1");
    expect(record.type).toBe("symptom");
    expect(record.createdAt).toBe(1_760_000_000_000);
    expect(record.updatedAt).toBe(1_760_000_001_000);
  });

  test("rejects whitespace-only required fields", () => {
    expect(() =>
      createHealthRecord({ id: "   ", type: "symptom", value: null }, 1_760_000_000_000),
    ).toThrow("Health input id is required");

    expect(() =>
      createHealthRecord({ id: "health-1", type: "   ", value: null }, 1_760_000_000_000),
    ).toThrow("Health input type is required");
  });

  test("rejects non-finite timestamps", () => {
    expect(() =>
      createHealthRecord({ id: "health-1", type: "symptom", value: null, occurredAt: Number.NaN }, 1_760_000_000_000),
    ).toThrow("Health input timestamp must be finite");

    expect(() =>
      createHealthRecord({ id: "health-1", type: "symptom", value: null }, Number.POSITIVE_INFINITY),
    ).toThrow("Health input current timestamp must be finite");
  });
});
