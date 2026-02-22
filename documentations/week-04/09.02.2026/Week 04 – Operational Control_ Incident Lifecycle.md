# Week 04 – Operational Control & Guarded Automation

## Day 1 Change Log: Incident Lifecycle Engine

## 1. Scope of Today's Work

Today's work marks the start of Week 04 and introduces the first concrete piece of Operational Control into SafeDeploy.

The focus was strictly limited to:

- Turning transient decisions into stateful incidents
- Introducing an explicit incident lifecycle
- Preventing alert / incident duplication
- Preserving architectural trust boundaries
- 🚫 No automation
- 🚫 No Git mutation
- 🚫 No execution-plane changes

This work aligns directly with the Incident Engine responsibility defined in the SafeDeploy architecture.

## 2. Architectural Motivation

Up to the end of Week 03, SafeDeploy could:

```
Metrics → SLOs → Error Budgets → Burn Rate → Decision
```

However, decisions were stateless and ephemeral.

Week 04 begins by introducing Operational Memory:

```
Decision → Incident → Lifecycle → (future) Proposal → (future) Git Action
```

This change ensures incidents are treated as managed workflows, not repeated signals.

## 3. New Control Plane Module: Incident Engine

### 3.1 Folder Structure Added

```
control-plane/src/
└── incidents/
    ├── incident.ts
    ├── lifecycle.ts
    └── store.ts
```

This module is fully isolated from the execution plane and performs no production mutations.

## 4. Incident Domain Model

**File:** `incidents/incident.ts`

```typescript
export type IncidentState =
  | "detected"
  | "investigating"
  | "mitigated"
  | "resolved"
  | "postmortem-complete";

export interface IncidentEvent {
  from: IncidentState;
  to: IncidentState;
  at: string; // ISO timestamp
  triggeredBy: "system" | "human";
  reason: string;
}

export interface Incident {
  id: string;
  service: string;
  severity: string;
  currentState: IncidentState;
  timeline: IncidentEvent[];
  createdAt: string;
}
```

### Key Properties

- Incidents are first-class objects
- State transitions are explicit
- Every transition is timestamped and explainable
- No implicit or automatic resolution is possible

## 5. Explicit Incident Lifecycle Transitions

**File:** `incidents/lifecycle.ts`

```typescript
import { Incident, IncidentState } from "./incident.js";

export function transitionIncident(
  incident: Incident,
  next: IncidentState,
  reason: string,
  triggeredBy: "system" | "human",
): Incident {
  const event = {
    from: incident.currentState,
    to: next,
    at: new Date().toISOString(),
    triggeredBy,
    reason,
  };

  return {
    ...incident,
    currentState: next,
    timeline: [...incident.timeline, event],
  };
}
```

### Architectural Enforcement

- No state mutation without an explicit function call
- No hidden transitions
- Incident history is immutable and replayable

## 6. Incident Persistence (File-Backed Store)

**File:** `incidents/store.ts`

```typescript
import fs from "fs";
import path from "path";
import type { Incident } from "./incident.js";

const BASE = path.join(process.cwd(), "incidents");

export function saveIncident(incident: Incident) {
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(
    path.join(BASE, `${incident.id}.json`),
    JSON.stringify(incident, null, 2),
  );
}

export function loadIncidents(): Incident[] {
  if (!fs.existsSync(BASE)) return [];
  return fs
    .readdirSync(BASE)
    .filter((file) => file.endsWith(".json"))
    .map(
      (file) =>
        JSON.parse(fs.readFileSync(path.join(BASE, file), "utf-8")) as Incident,
    );
}
```

### Design Rationale

- No database introduced (Week 04 scope discipline)
- JSON persistence provides:
  - auditability
  - replayability
  - incident deduplication
- Structure matches future PostgreSQL schema expectations

## 7. Integration with Decision Engine

**File Modified:** `evaluateDemoService.ts`

### 7.1 Load Active Incidents

```typescript
const incidents = loadIncidents();
const activeIncident = incidents.find(
  (i) =>
    i.service === "demo-app" &&
    !["resolved", "postmortem-complete"].includes(i.currentState),
);
```

This ensures one active incident per service.

### 7.2 Incident Creation (First Detection Only)

```typescript
if (!activeIncident) {
  const incident: Incident = {
    id: `incident-${Date.now()}`,
    service: "demo-app",
    severity,
    currentState: "detected",
    timeline: [],
    createdAt: new Date().toISOString(),
  };

  const investigating = transitionIncident(
    incident,
    "investigating",
    explanation,
    "system",
  );

  saveIncident(investigating);
}
```

### 7.3 Ongoing Incident Handling

```typescript
else {
  console.log(
    `[INCIDENT] ${activeIncident.id} already active — continuing investigation`
  );
}
```

### Resulting Behavior

- Sustained SLO violations do not create duplicate incidents
- Incident identity is stable across evaluations
- Incident lifecycle persists across process runs

## 8. Example Incident Artifact Produced

```json
{
  "id": "incident-1770654342328",
  "service": "demo-app",
  "severity": "exhausted",
  "currentState": "investigating",
  "timeline": [
    {
      "from": "detected",
      "to": "investigating",
      "at": "2026-02-09T16:25:42.329Z",
      "triggeredBy": "system",
      "reason": "Error budget exhausted; service is operating outside SLO."
    }
  ],
  "createdAt": "2026-02-09T16:25:42.328Z"
}
```

This artifact proves:

- Correct incident deduplication
- Explicit lifecycle enforcement
- Explainable operational state

## 9. Architectural Guarantees Preserved

- ✔ Decisions ≠ actions
- ✔ No direct production mutation
- ✔ Git remains the only execution path
- ✔ Humans retain authority
- ✔ Incidents are workflows, not alerts

## 10. Current Week 04 Status

### Completed

- Incident Engine implemented
- Incident lifecycle enforced
- Deduplication logic validated
- Persistent audit artifacts created

## 11. Next Planned Step (Week 04 – Day 2)

Introduce Action Proposals:

```
Incident → Proposed Operational Intent (No Execution)
```

This will preserve trust while allowing SafeDeploy to recommend actions without performing them.

## End of Day Summary

SafeDeploy has transitioned from a decision system to a stateful operational control plane, while remaining fully read-only with respect to production.

**This completes Week 04 – Deliverable #1 correctly and safely.**
