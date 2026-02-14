import { describe, it, expect } from "vitest";
import { calculateErrorBudget } from "../errorBudget.js";

describe("calculateErrorBudget", () => {
  it("calculates total allowed errors correctly", () => {
    const result = calculateErrorBudget(0.99, 1000, 0, 1 / 30);

    // 1% of 1000 = 10 allowed errors
    expect(result.total).toBeCloseTo(10);
  });

  it("never returns negative remaining budget", () => {
    const result = calculateErrorBudget(0.99, 1000, 50, 1 / 30);

    expect(result.remaining).toBe(0);
  });

  it("burn rate increases as bad events increase", () => {
    const low = calculateErrorBudget(0.99, 1000, 2, 1 / 30);
    const high = calculateErrorBudget(0.99, 1000, 8, 1 / 30);

    expect(high.burnRate).toBeGreaterThan(low.burnRate);
  });
});
