# Week 03 — Define Health & Make Decisions

## Objective

The objective of Week 03 was to prove that SafeDeploy can reason about system health using SLOs and error budgets, and make correct, explainable decisions without relying on gut feeling, raw metrics, or infrastructure signals.

**Success condition:**

> SafeDeploy makes decisions based on SLOs, not gut feelings or raw metrics.

No automation, no rollback execution, no database persistence was introduced in this week.

## Architectural Positioning

SafeDeploy operates as a control plane, fully decoupled from the execution environment.

- Demo application runs in Kubernetes (execution plane)
- Prometheus observes the demo application (truth layer)
- SafeDeploy runs externally and only reads metrics
- Decisions are made without mutating production

```
Demo App ──▶ Prometheus ──▶ SafeDeploy Control Plane
             (truth)          (reasoning)
```

SafeDeploy never queries the demo app directly.

## Scope and Non-Goals

### Included

- SLI definitions
- SLO contracts
- Error budget calculation
- Burn-rate evaluation
- Decision explanation
- Incident documentation

### Explicitly Excluded

- Automated rollback
- Database (Prisma)
- APIs
- UI
- Kubernetes deployment of SafeDeploy
- AI / agents

## Control Plane Structure

```
control-plane/
├── src/
│   ├── slo/
│   │   ├── sli.ts
│   │   ├── slo.ts
│   │   └── errorBudget.ts
│   ├── observability/
│   │   └── prometheus.ts
│   ├── decisions/
│   │   ├── burnRate.ts
│   │   └── explain.ts
│   ├── evaluateService.ts
│   └── index.ts
├── tsconfig.json
└── .env
```

## Step 1 — Service Level Indicators (SLIs)

SLIs define what users feel. They are defined about the demo service, not inside it.

**sli.ts**

```typescript
export interface SLI {
  name: string;
  description: string;
  promQuery: string;
  unit: string;
}

export const DEMO_APP_SLIS: SLI[] = [
  {
    name: "request_latency_p95",
    description: "95th percentile request latency",
    unit: "seconds",
    promQuery: `
      histogram_quantile(
        0.95,
        sum by (le)(
          rate(http_request_duration_seconds_bucket[5m])
        )
      )
    `,
  },
];
```

## Step 2 — Service Level Objectives (SLOs)

SLOs turn SLIs into explicit contracts.

**slo.ts**

```typescript
export interface SLO {
  name: string;
  target: number;
  windowDays: number;
  rationale: string;
}

export const DEMO_APP_SLOS: SLO[] = [
  {
    name: "latency-p95-300ms",
    target: 300,
    windowDays: 30,
    rationale: "Latency above 300ms is perceived as user-visible slowness.",
  },
];
```

## Step 3 — Error Budget Calculation

Error budgets convert SLO violations into decision currency.

**errorBudget.ts**

```typescript
export interface ErrorBudget {
  total: number;
  remaining: number;
  consumed: number;
  burnRate: number;
}

export function calculateErrorBudget(
  sloTarget: number,
  totalEvents: number,
  badEvents: number,
  timeWindowRatio: number
): ErrorBudget {
  const allowedBadEvents = totalEvents * (1 - sloTarget);
  const consumed = badEvents;
  const remaining = Math.max(allowedBadEvents - consumed, 0);
  return {
    total: allowedBadEvents,
    remaining,
    consumed,
    burnRate: consumed / (allowedBadEvents * timeWindowRatio),
  };
}
```

## Step 4 — Burn-Rate Decision Logic

Burn rate answers how urgent the situation is.

**burnRate.ts**

```typescript
export type BurnRateSeverity =
  | "normal"
  | "slow-burn"
  | "fast-burn"
  | "exhausted";

export function evaluateBurnRate(
  burnRate: number,
  remainingRatio: number
): BurnRateSeverity {
  if (remainingRatio <= 0) return "exhausted";
  if (burnRate > 2) return "fast-burn";
  if (burnRate > 1) return "slow-burn";
  return "normal";
}
```

## Step 5 — Decision Explanation

**explain.ts**

```typescript
export function explainBurnDecision(severity: string): string {
  switch (severity) {
    case "fast-burn":
      return "Error budget is being consumed at a critical rate; user impact likely.";
    case "slow-burn":
      return "Error budget consumption exceeds sustainable rate; monitor closely.";
    case "exhausted":
      return "Error budget exhausted; service is operating outside SLO.";
    default:
      return "Service operating within SLO.";
  }
}
```

## Step 6 — Prometheus Adapter (Read-Only)

**prometheus.ts**

```typescript
import axios from "axios";

const PROMETHEUS_URL = process.env.PROM_URL!;

export async function queryPrometheus(query: string) {
  const res = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
    params: { query },
  });
  return res.data.data.result;
}
```

## Step 7 — End-to-End Evaluation Pipeline

**evaluateService.ts**

```typescript
import { DEMO_APP_SLIS } from "./slo/sli";
import { DEMO_APP_SLOS } from "./slo/slo";
import { queryPrometheus } from "./observability/prometheus";
import { calculateErrorBudget } from "./slo/errorBudget";
import { evaluateBurnRate } from "./decisions/burnRate";
import { explainBurnDecision } from "./decisions/explain";

export async function evaluateDemoService() {
  const latencyResult = await queryPrometheus(DEMO_APP_SLIS[0].promQuery);
  const latencySeconds = Number(latencyResult[0].value[1]);
  const latencyMs = latencySeconds * 1000;

  const slo = DEMO_APP_SLOS[0];
  const totalEvents = 10_000;
  const badEvents = latencyMs > slo.target ? 50 : 0;

  const budget = calculateErrorBudget(0.999, totalEvents, badEvents, 1 / 30);
  const severity = evaluateBurnRate(
    budget.burnRate,
    budget.remaining / budget.total
  );

  const explanation = explainBurnDecision(severity);
  console.log(`[DECISION] severity=${severity} | reason=${explanation}`);
}
```

## Step 8 — Entry Point

**index.ts**

```typescript
import { evaluateDemoService } from "./evaluateService";

evaluateDemoService().catch(console.error);
```

## Failure Simulation

A `/slow` endpoint (~3000ms latency) was used to simulate user-visible degradation. SafeDeploy did not know about this endpoint and reacted purely based on observed latency metrics.

**Observed during failure:**

```
[DECISION] severity=exhausted | reason=Error budget exhausted; service is operating outside SLO.
```

**Observed after recovery:**

```
[DECISION] severity=normal | reason=Service operating within SLO.
```

## Incident Artifact

An incident report was created:

```
incident-reports/incident-003-slo-violation.md
```

The incident documents detection, decision, action, recovery, and learning.

## Final Outcome

By the end of Week 03:

- Health is defined by SLOs
- Decisions are based on error budgets
- Alerts are replaced by signals
- Recovery is recognized automatically
- No production mutations occur

**SafeDeploy is now a decision-capable reliability control plane.**

## Week 03 Completion Statement

> SafeDeploy can explain, using externally observed SLOs and error budgets, why a deployment is unsafe — without touching production.
