import { describe, expect, it } from "vitest";
import { HealthRecordSchema } from "../../src/storage/repository/healthRecordRepository";

describe("HealthRecord validation", () => {
  it("accepts valid health records", () => {
    expect(() => HealthRecordSchema.parse({
      id: "record-1",
      createdAt: Date.now(),
      type: "vital",
      payload: { value: 120 }
    })).not.toThrow();
  });
});
