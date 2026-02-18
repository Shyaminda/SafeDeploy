import type { ServiceDefinition } from "../catalog/serviceDefinition.js";
import { evaluateServicePolicies } from "./policyEngine.js";
import type { PolicyViolation } from "./policyTypes.js";

export interface PromotionGateResult {
  allowed: boolean;
  violations: PolicyViolation[];
}

export function evaluatePromotion(
  service: ServiceDefinition,
  errorBudgetHealthy: boolean,
): PromotionGateResult {
  const violations = evaluateServicePolicies(service, errorBudgetHealthy);

  const blocking = violations.filter((v) => v.blocking);

  return {
    allowed: blocking.length === 0,
    violations,
  };
}
