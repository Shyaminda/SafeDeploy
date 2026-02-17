export type PolicyViolationType =
  | "missing-slo"
  | "missing-owner"
  | "missing-rollback-strategy"
  | "no-canary-strategy"
  | "error-budget-exhausted"
  | "restricted-window";

export interface PolicyViolation {
  type: PolicyViolationType;
  service: string;
  message: string;
  blocking: boolean;
  detectedAt: string;
}
