import { describe, expect, it } from "vitest";
import { healthRecordSchema } from "../../src/storage/healthRecordSchema";

describe("health record schema", () => {
  it("validates a health record", () => {
    expect(() => healthRecordSchema.parse({
      id: "1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: "measurement",
      payload: { value: 120 }
    })).not.toThrow();
  });
});
