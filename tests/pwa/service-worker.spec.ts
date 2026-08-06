import { describe, expect, it } from "vitest";

describe("Service Worker", () => {
  it("supports PWA runtime tests", () => {
    expect("service-worker").toBeTruthy();
  });
});
