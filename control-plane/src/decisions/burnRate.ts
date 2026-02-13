export type BurnRateSeverity =
  | "normal"
  | "slow-burn"
  | "fast-burn"
  | "exhausted";

export function evaluateBurnRate(
  burnRate: number,
  remainingBudgetRatio: number,
): BurnRateSeverity {
  if (remainingBudgetRatio <= 0) {
    return "exhausted";
  }

  if (burnRate > 2) {
    return "fast-burn";
  }

  if (burnRate > 1) {
    return "slow-burn";
  }

  return "normal";
}
