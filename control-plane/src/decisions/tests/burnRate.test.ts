import { describe, it, expect } from "vitest";
import { evaluateBurnRate } from "../burnRate.js";

describe("evaluateBurnRate", () => {
  it("classifies normal state correctly", () => {
    const severity = evaluateBurnRate(0.1, 0.9);
    expect(severity).toBe("normal");
  });

  it("detects fast burn", () => {
    const severity = evaluateBurnRate(5, 0.5);
    expect(severity).toBe("fast-burn");
  });

  it("detects exhausted budget", () => {
    const severity = evaluateBurnRate(10, 0);
    expect(severity).toBe("exhausted");
  });
});
