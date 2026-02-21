import { describe, it, expect } from "vitest";
import { evaluateBurnRate } from "../burnRate.js";

describe("evaluateBurnRate", () => {
  it("classifies normal state correctly", () => {
    const severity = evaluateBurnRate(0.1);
    expect(severity).toBe("normal");
  });

  it("returns normal when burnRate is exactly 1", () => {
    const severity = evaluateBurnRate(1);
    expect(severity).toBe("normal");
  });

  it("detects slow burn when burnRate > 1 and <= 2", () => {
    const severity = evaluateBurnRate(1.5);
    expect(severity).toBe("slow-burn");
  });

  it("returns slow-burn when burnRate is exactly 2", () => {
    const severity = evaluateBurnRate(2);
    expect(severity).toBe("slow-burn");
  });

  it("detects slow burn at boundary (burnRate slightly above 1)", () => {
    const severity = evaluateBurnRate(1.01);
    expect(severity).toBe("slow-burn");
  });

  it("detects fast burn", () => {
    const severity = evaluateBurnRate(5);
    expect(severity).toBe("fast-burn");
  });

  it("detects fast burn at boundary (burnRate slightly above 2)", () => {
    const severity = evaluateBurnRate(2.01);
    expect(severity).toBe("fast-burn");
  });

  it("detects exhausted budget when remaining is 0", () => {
    const severity = evaluateBurnRate(10);
    expect(severity).toBe("exhausted");
  });

  it("detects exhausted budget when remaining is negative", () => {
    const severity = evaluateBurnRate(1);
    expect(severity).toBe("exhausted");
  });

  it("returns exhausted regardless of burn rate when budget depleted", () => {
    // Even with normal burn rate, exhausted takes precedence
    const severity = evaluateBurnRate(0.5);
    expect(severity).toBe("exhausted");
  });
});
