import {
  loadBudgetWindow,
  saveBudgetWindow,
  type BudgetWindowState,
} from "../budget-state/budgetWindow.js";

export function initializeOrRotateWindow(
  service: string,
  allowed: number,
  windowDurationMs: number,
): BudgetWindowState {
  const existing = loadBudgetWindow(service);
  const now = Date.now();

  if (!existing) {
    const state: BudgetWindowState = {
      service,
      windowStart: new Date().toISOString(),
      allowed,
      consumedSoFar: 0,
    };

    saveBudgetWindow(state);
    return state;
  }

  const start = new Date(existing.windowStart).getTime();

  if (now - start > windowDurationMs) {
    const rotated: BudgetWindowState = {
      service,
      windowStart: new Date().toISOString(),
      allowed,
      consumedSoFar: 0,
    };

    saveBudgetWindow(rotated);
    return rotated;
  }

  return existing;
}
