# # SafeDeploy — SLO-Driven Reliability Control Plane

SafeDeploy is a **reliability governance control plane** that evaluates system health using SLOs and error budgets, manages incidents as stateful workflows, and enforces safe operational actions through GitOps.

It is not a CI/CD tool or deployment system.

It is a system that **decides whether deployments should happen at all**.

---

## 🚨 The Problem

Modern systems change faster than teams can safely understand their impact.

As a result:

* Deployments introduce outages
* Monitoring reflects infrastructure, not user experience
* Incidents are reactive and inconsistent
* Teams repeat the same failures
* Automation is either unsafe or underutilized

SafeDeploy addresses this by treating **reliability as a governed system**, not an afterthought.

---

## 🧠 What SafeDeploy Is

SafeDeploy is a **control plane** that:

* Defines **what “healthy” means** using SLOs
* Evaluates **real-time system behavior** via Prometheus
* Converts signals into **error budgets and burn rates**
* Manages **incident lifecycle state**
* Generates **proposed operational actions** (rollback, promotion control)
* Enforces **policy and governance rules**
* Executes changes **only through Git (never directly)**

---

## 🏗 Architecture Overview

SafeDeploy enforces a strict separation of concerns:

### Control Plane (SafeDeploy Core)

Responsible for reasoning, governance, and decision-making:

* SLO & error budget evaluation
* Incident lifecycle management
* Policy enforcement (SLOs, ownership, rollout strategy)
* Proposal generation (rollback / promotion control)
* Audit & evidence tracking

> The control plane **never mutates production systems directly**.

---

### Execution Plane (Kubernetes + GitOps)

Responsible only for applying approved changes:

* ArgoCD (GitOps synchronization)
* Argo Rollouts (progressive delivery)
* Kubernetes (runtime execution)

All actions flow through:

```
Control Plane → Git (PR/commit) → Execution Plane
```

There are **no direct API calls or kubectl actions** from SafeDeploy.

---

### Observability Layer (Source of Truth)

* Prometheus provides all runtime signals
* SafeDeploy is strictly **read-only**
* All decisions are derived from observable evidence

> SafeDeploy never invents metrics or assumptions.

---

## 🔄 Core Control Loop

The system continuously evaluates service health:

1. Fetch metrics from Prometheus
2. Compute SLI → SLO → error budget
3. Calculate burn rate severity:

   * `normal`
   * `slow-burn`
   * `fast-burn`
   * `exhausted`
4. If unhealthy:

   * Create or update incident
   * Generate rollback proposal (idempotent)
   * Apply freeze window if needed
5. Evaluate promotion eligibility via policy engine
6. Append audit evidence

---

## 🚑 Incident Lifecycle

Incidents are treated as **stateful workflows**, not alerts:

```
detected → investigating → mitigated → resolved → postmortem-complete
```

Key properties:

* One active incident per service
* No duplication
* Explicit, timestamped transitions
* Fully persisted and replayable

---

## ⚙️ Action Proposal System

SafeDeploy does not act directly.

Instead, it generates **proposals**:

* `rollback-rollout`
* `promote-canary`
* `block-promotion`

Properties:

* Proposals are **inert**
* Require **human approval**
* Idempotent (no duplicates per incident)

---

## 👨‍💻 Human-Governed Execution

When a proposal is approved:

1. Proposal marked `approved`
2. Rollback commit prepared in environment repo
3. New Git branch created
4. Pull request opened
5. ArgoCD reconciles change
6. Incident transitions to `mitigated`

> Git is the **only actuator** in the system.

---

## 🛡 Policy & Governance Engine

SafeDeploy enforces both **structural** and **runtime** policies.

### Structural Requirements

Every service must define:

* Owner
* SLOs
* Rollback strategy
* Deployment strategy (canary required)

---

### Runtime Governance

Deployment is blocked if:

* Error budget is exhausted
* Burn rate exceeds safe threshold
* Remaining budget is below safety margin
* Freeze window is active

Violations result in:

* Policy incidents
* Promotion-block proposals

---

## ❄️ Freeze Window Mechanism

When error budget is exhausted:

* Service enters a **temporary freeze period**
* All promotions are blocked
* Stability is enforced before further changes

This prevents rapid redeploy cycles during instability.

---

## 🧾 Audit & Evidence System

Every decision produces structured evidence:

```
evidence/
  incident-XXXX/
    decision.json
    slo.json
    budget.json
    proposal.json
    approval.json
    resolution.json
```

Additionally:

* Append-only audit logs
* Stream-separated domains (`metrics`, `budget`, `incidents`, `governance`)

Guarantees:

* Full traceability
* Explainable decisions
* Replayable system behavior

---

## 💾 Data Persistence

All state is stored locally as artifacts:

* `incidents/*.json`
* `action-proposals/*.json`
* `control-plane/state/*`
* `control-plane/audit/*.log`

This design prioritizes:

* Simplicity
* Debuggability
* Deterministic behavior

---

## 📊 Reliability Reporting

SafeDeploy can generate a full system snapshot including:

* Service metadata
* Error budget state
* Active incidents
* Active proposals
* Governance status

---

## 🧰 Tech Stack

### Control Plane

* TypeScript (Node.js)
* Zod (runtime validation)
* Vitest (testing)

### Observability

* Prometheus (metrics & query API)

### Execution Plane

* Kubernetes
* ArgoCD (GitOps)
* Argo Rollouts (progressive delivery / canary)

### Infrastructure & Tooling

* Docker (image build)
* pnpm (package management)
* ESLint + Prettier (code quality)
* Husky + lint-staged (pre-commit enforcement)

### Architecture Patterns

* GitOps
* Progressive Delivery (Canary)
* SLO / Error Budget–driven decisions
* Event-driven incident lifecycle

---

## 🧪 Engineering Quality

* Strict TypeScript (`strict`, `noUncheckedIndexedAccess`)
* Zod runtime validation (env + Prometheus responses)
* ~98% test coverage (Vitest)
* ESLint + security rules
* Pre-commit enforcement (Husky)
* Deterministic package management (pnpm)

---

## ⚠️ Current Scope

* Single-service prototype (`demo-app`)
* File-based persistence (no DB yet)
* CLI-based approval workflow

This is intentional to prioritize **correctness, traceability, and architecture clarity**.

---

## 🚀 Why This Matters

SafeDeploy demonstrates how to:

* Treat deployments as **risk-managed decisions**
* Use SLOs as the **source of truth**
* Convert metrics into **governed actions**
* Enforce **reliability at the platform level**
* Keep humans in control while enabling automation

---

## 🧩 Key Principles

* Git is the only path to production
* No direct production access
* Metrics before automation
* Humans retain authority
* Learning is mandatory and persistent

---

## 🧭 Summary

SafeDeploy is not a deployment tool.

It is a **reliability governance system** that decides:

> *Should this system change — and is it safe to do so right now?*

---

## 📄 License

ISC

