import { describe, it, expect } from "vitest";
import { calculateErrorBudget } from "../errorBudget.js";

describe("calculateErrorBudget", () => {
  it("calculates total allowed errors correctly", () => {
    const result = calculateErrorBudget(0.99, 1000, 0, 1 / 30);

    // 1% of 1000 = 10 allowed errors
    expect(result.total).toBeCloseTo(10);
  });

  it("calculates consumed errors correctly", () => {
    const result = calculateErrorBudget(0.99, 1000, 5, 1 / 30);

    expect(result.consumed).toBe(5);
  });

  it("calculates remaining errors when under budget", () => {
    const result = calculateErrorBudget(0.99, 1000, 3, 1 / 30);

    // 10 allowed - 3 consumed = 7 remaining
    expect(result.remaining).toBeCloseTo(7);
  });

  it("never returns negative remaining budget", () => {
    const result = calculateErrorBudget(0.99, 1000, 50, 1 / 30);

    expect(result.remaining).toBe(0);
  });

  it("returns zero remaining when exactly at budget", () => {
    const result = calculateErrorBudget(0.99, 1000, 10, 1 / 30);

    expect(result.remaining).toBeCloseTo(0);
  });

  it("calculates burn rate correctly", () => {
    // burnRate = consumedErrors / (allowedErrors * timeWindowRatio)
    // With 5 bad events, 10 allowed errors, 1/30 ratio:
    // burnRate = 5 / (10 * 1/30) = 5 / 0.333... = 15
    const result = calculateErrorBudget(0.99, 1000, 5, 1 / 30);

    expect(result.burnRate).toBeCloseTo(15);
  });

  it("burn rate increases as bad events increase", () => {
    const low = calculateErrorBudget(0.99, 1000, 2, 1 / 30);
    const high = calculateErrorBudget(0.99, 1000, 8, 1 / 30);

    expect(high.burnRate).toBeGreaterThan(low.burnRate);
  });

  it("returns zero burn rate when no bad events", () => {
    const result = calculateErrorBudget(0.99, 1000, 0, 1 / 30);

    expect(result.burnRate).toBe(0);
  });

  it("returns all fields in correct structure", () => {
    const result = calculateErrorBudget(0.99, 1000, 5, 1 / 30);

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("remaining");
    expect(result).toHaveProperty("consumed");
    expect(result).toHaveProperty("burnRate");
  });

  it("handles different SLO targets", () => {
    // 99.9% SLO = 0.1% error budget
    const result = calculateErrorBudget(0.999, 10000, 0, 1 / 30);

    // 0.1% of 10000 = 10 allowed errors
    expect(result.total).toBeCloseTo(10);
  });

  it("handles full time window ratio", () => {
    // timeWindowRatio = 1 means full window elapsed
    const result = calculateErrorBudget(0.99, 1000, 5, 1);

    // burnRate = 5 / (10 * 1) = 0.5
    expect(result.burnRate).toBeCloseTo(0.5);
  });
});
