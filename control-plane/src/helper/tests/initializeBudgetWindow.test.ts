import { describe, it, expect, vi, beforeEach } from "vitest";
import { initializeOrRotateWindow } from "../initializeBudgetWindow.js";
import * as budgetStore from "../../budget-state/store.js";

describe("initializeOrRotateWindow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a new window when none exists", () => {
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    const saveSpy = vi
      .spyOn(budgetStore, "saveBudgetWindow")
      .mockImplementation(() => {});

    const result = initializeOrRotateWindow(
      "demo-app",
      10,
      30 * 24 * 60 * 60 * 1000,
    );

    expect(result.service).toBe("demo-app");
    expect(result.allowed).toBe(10);
    expect(result.consumedSoFar).toBe(0);
    expect(saveSpy).toHaveBeenCalledWith(result);
  });

  it("returns existing window when still within duration", () => {
    const existing = {
      service: "demo-app",
      windowStart: new Date().toISOString(),
      allowed: 10,
      consumedSoFar: 5,
    };
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(existing);
    const saveSpy = vi.spyOn(budgetStore, "saveBudgetWindow");

    const result = initializeOrRotateWindow(
      "demo-app",
      10,
      30 * 24 * 60 * 60 * 1000,
    );

    expect(result).toBe(existing);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("rotates window when duration has expired", () => {
    const oldStart = new Date(
      Date.now() - 31 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 31 days ago
    const existing = {
      service: "demo-app",
      windowStart: oldStart,
      allowed: 10,
      consumedSoFar: 8,
    };
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(existing);
    const saveSpy = vi
      .spyOn(budgetStore, "saveBudgetWindow")
      .mockImplementation(() => {});

    const result = initializeOrRotateWindow(
      "demo-app",
      10,
      30 * 24 * 60 * 60 * 1000,
    );

    expect(result.consumedSoFar).toBe(0);
    expect(result.allowed).toBe(10);
    expect(result).not.toBe(existing);
    expect(saveSpy).toHaveBeenCalledWith(result);
  });

  it("does not rotate when within window duration", () => {
    // Window started 29 days ago — well within 30-day window, should NOT rotate
    const recentStart = new Date(
      Date.now() - 29 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const existing = {
      service: "demo-app",
      windowStart: recentStart,
      allowed: 10,
      consumedSoFar: 3,
    };
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(existing);
    const saveSpy = vi.spyOn(budgetStore, "saveBudgetWindow");

    const result = initializeOrRotateWindow(
      "demo-app",
      10,
      30 * 24 * 60 * 60 * 1000,
    );

    expect(result).toBe(existing);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
