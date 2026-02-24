# SafeDeploy – Week 05

## Platform Governance, Error Budgets & Reliability Control Plane

**Author:** Shyaminda Senevirathna  
**Project:** SafeDeploy Central Backend  
**Module:** Control Plane – SLO & Governance Engine

## 1. Executive Summary

Week 05 transformed SafeDeploy into a reliability-aware, policy-enforcing control plane.

This phase introduced:

- Centralized service metadata governance
- Strict SLO validation enforcement
- Error budget window lifecycle management
- Burn rate severity modeling
- Incident lifecycle orchestration
- Automated rollback proposal engine
- Promotion policy gate enforcement
- Freeze window governance
- Append-only structured audit logging
- Platform-level reliability reporting

The system now behaves similarly to a simplified internal SRE governance platform.

## 2. Central Service Definition (Governance Foundation)

**File:** `catalog/serviceDefinition.ts`

```typescript
export interface ServiceDefinition {
  name: string;
  owner: string;
  slos: {
    name: string;
    target: number;
  }[];
  deploymentStrategy: "canary" | "blue-green";
  rollbackStrategy: "git-revert" | "image-rollback";
  runbookUrl: string;
  costBudget?: number;
}
```

**Example service definition used in Week 05:**

```json
{
  "name": "demo-app",
  "owner": "platform-team",
  "slos": [
    {
      "name": "latency-p95-300ms",
      "target": 0.999
    }
  ],
  "deploymentStrategy": "canary",
  "rollbackStrategy": "git-revert",
  "runbookUrl": "https://internal/runbooks/demo-app",
  "costBudget": 100
}
```

**This guarantees:**

- Service metadata exists centrally
- Deployment and rollback strategies are defined
- Runbooks are mandatory
- Cost budget ready for future governance
- SLOs cannot be omitted

Zod validation enforces schema integrity. If invalid → promotion blocked → policy incident created.

## 3. Error Budget Window System

### 3.1 Budget Window State

```typescript
export interface BudgetWindowState {
  service: string;
  windowStart: string;
  allowed: number;
  consumedSoFar: number;
}
```

**Example persisted state:**

```json
{
  "service": "demo-app",
  "windowStart": "2026-02-21T20:12:41.454Z",
  "allowed": 10.000000000000009,
  "consumedSoFar": 10.000000000000009
}
```

**Meaning:**

- 30-day rolling window
- 10 allowed bad events
- 10 consumed → budget exhausted

### 3.2 Budget Initialization & Rotation

**File:** `helper/initializeBudgetWindow.ts`

```typescript
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
```

**Guarantees:**

- Budget resets after window expiry
- No permanent exhaustion
- Time-bounded reliability contract

## 4. Freeze Window Governance

**Persisted health state example:**

```json
{
  "service": "demo-app",
  "lastEvaluatedAt": "2026-02-21T20:57:37.960Z",
  "lastExhaustedAt": "2026-02-21T20:14:21.310Z",
  "freezeUntil": "2026-02-21T21:12:37.960Z"
}
```

**Meaning:**

- Error budget was exhausted
- Service frozen for 15 minutes
- Promotion blocked until freeze expiry

### Freeze Update Logic

```typescript
updateFreezeWindow("demo-app", 15 * 60 * 1000);
```

Prevents shortening existing freeze window.

### Automatic Unfreeze

```typescript
unfreezeIfExpired("demo-app");
```

Removes freeze once timestamp passes.

## 5. Runtime Evaluation Engine (Core Control Loop)

**File:** `evaluateDemoService.ts`

**High-level flow:**

1. Validate service definition
2. Fetch Prometheus metrics
3. Simulate failure impact
4. Update budget window
5. Calculate burn rate
6. Determine severity
7. Possibly create incident
8. Possibly create rollback proposal
9. Evaluate promotion eligibility
10. Append structured audit logs

**Core runtime structure:**

```typescript
export async function evaluateDemoService(): Promise<void> {
  let service;
  try {
    service = loadService("demo-app");
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const violations = mapZodIssuesToPolicyViolations(
        error.issues,
        "demo-app",
      );
      const policyIncident = createPolicyViolationIncident(violations);
      proposeBlockPromotion(policyIncident.id, "demo-app", violations, {
        total: 0,
        remaining: 0,
        burnRate: 0,
        consumed: 0,
      });
      return;
    }
    throw error;
  }

  const { budget, newIncidentCreated } = await evaluateRuntimeHealth();

  if (!newIncidentCreated) {
    evaluatePromotionEligibility(service, budget);
  }
}
```

This ensures governance always runs unless a new exhaustion incident was just created.

## 6. Incident Lifecycle

**Incident states:**

- `detected`
- `investigating`
- `mitigated`
- `resolved`
- `postmortem-complete`

**Exhaustion incident created only when:**

```typescript
budget.remaining <= 0 &&
severity === "exhausted" &&
no active exhaustion incident exists
```

This prevents duplicate rollbacks.

**Policy incidents are stored separately in:**

```
incidents/
incidents/policy-incidents/
```

## 7. Rollback Proposal Engine

Rollback is idempotent.

If an existing proposed rollback exists → reuse.  
If not → create new proposal.

```typescript
const existing = loadProposals().find(
  (p) =>
    p.incidentId === incident.id &&
    p.type === "rollback-rollout" &&
    p.status === "proposed",
);
```

Prevents duplicate rollouts.

## 8. Policy Engine & Promotion Governance

Week 05 introduced a first-class Policy Engine that evaluates both structural service compliance and runtime reliability constraints.

### 8.1 Policy Violation Types

**File:** `policy/policyTypes.ts`

```typescript
export type PolicyViolationType =
  | "missing-slo"
  | "missing-owner"
  | "missing-rollback-strategy"
  | "no-canary-strategy"
  | "error-budget-exhausted"
  | "restricted-window"
  | "error-budget-near-exhaustion"
  | "freeze-window-active";

export interface PolicyViolation {
  type: PolicyViolationType;
  service: string;
  message: string;
  blocking: boolean;
  detectedAt: string;
}
```

This provides strongly typed governance signals across the control plane.

### 8.2 Structural Policy Evaluation

**File:** `policy/policyEngine.ts`

```typescript
export function evaluateServicePolicies(
  service: ServiceDefinition,
  errorBudgetHealthy: boolean,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  if (!service.owner) {
    violations.push({
      type: "missing-owner",
      service: service.name,
      message: "Service owner not defined",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!service.slos?.length) {
    violations.push({
      type: "missing-slo",
      service: service.name,
      message: "No SLOs defined for the service",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!service.rollbackStrategy) {
    violations.push({
      type: "missing-rollback-strategy",
      service: service.name,
      message: "No rollback strategy defined for the service",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (!errorBudgetHealthy) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: "Error budget exhausted - promotion blocked",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (service.deploymentStrategy !== "canary") {
    violations.push({
      type: "no-canary-strategy",
      service: service.name,
      message: "Service must use canary deployment strategy",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  return violations;
}
```

**This enforces structural governance rules:**

- Owner must exist
- At least one SLO must exist
- Rollback strategy must be defined
- Canary deployment is mandatory
- Error budget health impacts promotion

### 8.3 Zod Validation → Policy Mapping

**File:** `policy/zodToPolicyMapper.ts`

```typescript
export function mapZodIssuesToPolicyViolations(
  issues: z.core.$ZodIssue[],
  service: string,
): PolicyViolation[] {
  return issues.map((issue) => {
    const field = issue.path.join(".");
    let violationType: PolicyViolation["type"];

    switch (field) {
      case "owner":
        violationType = "missing-owner";
        break;
      case "slos":
        violationType = "missing-slo";
        break;
      case "rollbackStrategy":
        violationType = "missing-rollback-strategy";
        break;
      case "deploymentStrategy":
        violationType = "no-canary-strategy";
        break;
      default:
        violationType = "restricted-window";
    }

    return {
      type: violationType,
      service,
      message: `Invalid or missing field: ${field}`,
      blocking: true,
      detectedAt: new Date().toISOString(),
    };
  });
}
```

This bridges schema validation failures directly into governance enforcement.

### 8.4 Runtime Promotion Gate

**File:** `policy/promotionGate.ts`

```typescript
const MIN_REMAINING_PERCENTAGE = 0.01;
const MAX_ALLOWED_BURN_RATE = 5;

export function evaluatePromotion(
  service: ServiceDefinition,
  budget: BudgetState,
): PromotionGateResult {
  const violations: PolicyViolation[] = [];

  const structural = evaluateServicePolicies(service, true);
  violations.push(...structural);

  const remainingPercentage = budget.remaining / budget.total;

  if (budget.remaining <= 0) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: "Error budget exhausted - production freeze active",
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (remainingPercentage < MIN_REMAINING_PERCENTAGE) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: `Remaining budget below safety threshold (${MIN_REMAINING_PERCENTAGE * 100}%)`,
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  if (budget.burnRate >= MAX_ALLOWED_BURN_RATE) {
    violations.push({
      type: "error-budget-exhausted",
      service: service.name,
      message: `Burn rate too high (${budget.burnRate}x) — risky to deploy`,
      blocking: true,
      detectedAt: new Date().toISOString(),
    });
  }

  const blocking = violations.filter((v) => v.blocking);

  return {
    allowed: blocking.length === 0,
    violations,
  };
}
```

**Promotion is allowed only if:**

- Structural policies pass
- Budget not exhausted
- Remaining percentage above safety threshold
- Burn rate below maximum threshold

This completes the governance layer.

**Promotion blocked when:**

- Error budget exhausted
- Remaining < safety threshold
- Freeze window active
- Structural violations exist
- Burn rate too high

All decisions logged using:

```typescript
appendAudit("governance", {...});
```

## 9. Append-Only Audit System

**Audit structure:**

```
audit/
  metrics/
  budget/
  incidents/
  proposals/
  governance/
```

**Append implementation:**

```typescript
export function appendAudit(stream: string, entry: any): void {
  const dir = path.join(BASE, stream);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${stream}.log`);

  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  fs.appendFileSync(file, JSON.stringify(record) + "\n");
}
```

**Properties:**

- Append-only
- Structured JSON
- Stream-based separation
- Immutable history

## 10. Reliability Reporting

**Report aggregates:**

- Service metadata
- Budget window state
- Freeze state
- Active incidents
- Active proposals

Produces full reliability snapshot of platform.

## 11. Validation Checklist Confirmation

- ✔ Services cannot bypass SLO definitions
- ✔ Promotion blocked by policy
- ✔ Error budget affects promotion
- ✔ Service metadata centralized
- ✔ Policy violations auditable

All requirements satisfied.

## 12. Final Outcome

Week 05 delivered a fully governed reliability control plane.

**System now models:**

- SLO contracts
- Error budget lifecycle
- Burn rate detection
- Freeze governance
- Incident orchestration
- Rollback automation
- Promotion blocking
- Structured audit trails
- Platform reliability visibility

This mirrors simplified internal SRE governance tooling used in production environments.

---

**END OF WEEK 05 DOCUMENTATION**
