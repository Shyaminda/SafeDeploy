# Decision Model — How SafeDeploy Decides

## Purpose of This Document

This document defines **how SafeDeploy makes decisions**.

It explains:

- what inputs are considered
- how those inputs are evaluated
- what decision states exist
- how decisions are justified

This document intentionally avoids implementation details and focuses on **decision correctness**.

---

## Core Decision Principle

> **SafeDeploy makes decisions based on SLO compliance and error budgets, not raw metrics or intuition.**

Infrastructure health, resource usage, and pod state are not decision inputs unless they directly
translate into user-visible impact.

---

## Decision Inputs

SafeDeploy decisions are derived from four inputs:

### 1. Service Level Indicators (SLIs)

SLIs represent **what users experience**.

Examples:

- Request latency (p95)
- Request success rate

SLIs are sourced exclusively from observability systems (Prometheus).

---

### 2. Service Level Objectives (SLOs)

SLOs define **acceptable user experience** as explicit contracts.

Example:

- `p95 latency < 300ms`
- `availability ≥ 99.9%`

SLOs establish:

- what is considered healthy
- what constitutes a violation
- how much degradation is tolerated

---

### 3. Error Budgets

Error budgets quantify **how much SLO violation is allowed** within a defined time window.

They convert SLOs into a **numerical decision currency**.

Conceptually:

Error budgets enable objective decisions such as:

- whether deployments may continue
- whether rollback is justified
- whether reliability work must be prioritized

---

### 4. Burn Rate

Burn rate measures **how fast the error budget is being consumed** relative to the allowed pace.

It answers the question:

> “How urgent is the situation right now?”

Burn rate is evaluated over rolling time windows and reflects the rate of user impact, not cumulative damage.

---

## Decision Evaluation Flow

The decision flow follows a strict sequence:

1. Query SLIs from Prometheus
2. Compare SLI values against SLO targets
3. Classify violations as bad events
4. Calculate error budget consumption
5. Compute burn rate
6. Derive decision severity
7. Generate a human-readable explanation

No decision step mutates production systems.

---

## Decision Severity States

SafeDeploy classifies decisions into four severity states.

### `normal`

- SLOs are being met
- Error budget consumption is within acceptable limits
- Deployments may proceed

Interpretation:

> The system is healthy from a user perspective.

---

### `slow-burn`

- Error budget is being consumed faster than allowed
- No immediate user catastrophe
- Sustained behavior will exhaust budget

Interpretation:

> Risk is increasing; investigate and limit further exposure.

---

### `fast-burn`

- Error budget is being consumed at a critical rate
- User impact is imminent or already significant

Interpretation:

> Immediate action required to prevent widespread impact.

---

### `exhausted`

- Error budget is fully consumed
- SLO contract is violated

Interpretation:

> Continuing change is unjustifiable; rollback or stabilization is required.

---

## Decision Authority and Action

SafeDeploy **does not execute actions directly**.

Decisions are:

- emitted as signals
- logged with explanations
- recorded for audit and learning

Humans remain responsible for:

- approving rollbacks
- resuming deployments
- modifying policies

This preserves accountability and prevents unsafe automation.

---

## Relationship to Incidents

A decision may result in an incident when:

- severity reaches `fast-burn` or `exhausted`
- user impact is confirmed
- corrective action is required

Incident reports document:

- what decision was made
- why it was justified
- what action was taken
- what was learned

Decisions are **inputs to incidents**, not replacements for them.

---

## Architectural Constraints

The decision system enforces the following constraints:

- Decisions are derived only from observable data
- No production mutations occur in the control plane
- Every decision must be explainable
- Error budget exhaustion overrides delivery velocity
- Recovery is evaluated independently from historical incidents

These constraints are structural, not procedural.

---

## Summary

SafeDeploy’s decision model ensures that:

- Health is defined by user experience
- Risk is quantified, not guessed
- Urgency is measurable
- Actions are justified, not reactive
- Learning is mandatory

This decision model is the foundation that enables SafeDeploy to safely evolve toward controlled automation in later stages.
