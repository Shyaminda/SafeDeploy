# Error Budgets

## Purpose

This document explains **what error budgets are**, why they exist, and how SafeDeploy uses them to make decisions.

Error budgets are the **core decision currency** in the SafeDeploy platform.

---

## What Is an Error Budget

An error budget represents **how much user-visible failure is allowed** within a defined SLO window.

It answers the question:

> “How much reliability can we spend before we must stop changing the system?”

---

## Why Error Budgets Exist

Without error budgets:
- Reliability decisions become subjective
- Delivery velocity conflicts with stability
- Risk tolerance is unclear

Error budgets replace debate with math.

---

## Error Budget Derivation

An error budget is derived directly from an SLO.

Example:

- Total requests: 10,000
- SLO target: 99.9%
- Allowed failure rate: 0.1%

```
Allowed bad events = 10,000 × 0.001 = 10
```

Those 10 bad events are the **entire error budget** for the window.

---

## Bad Events

A bad event is **any request that violates the SLO**.

Examples:
- Requests slower than the latency threshold
- Requests that fail availability checks

Bad events are not infrastructure failures — they are **broken user promises**.

---

## Remaining Error Budget

Remaining error budget represents **how much tolerance is left**.

It is calculated as:

```
remaining = max(allowed − consumed, 0)
```

Remaining budget never becomes negative.
Overspending is reflected through burn rate, not negative balance.

---

## Burn Rate

Burn rate measures **how fast the error budget is being consumed** relative to the allowed pace.

- Burn rate < 1: sustainable
- Burn rate ≈ 1: on the edge
- Burn rate > 1: unsafe

Burn rate determines **urgency**, not health.

---

## Decision Impact

SafeDeploy uses error budgets to:
- Allow or restrict deployments
- Justify rollbacks
- Trigger incident workflows

When the error budget is exhausted:
- All non-essential changes must stop
- Reliability recovery becomes the priority

---

## Recovery and Reset

Error budgets are evaluated over rolling windows.

- Systems can recover
- Burn rate can return to zero
- Budget resets when the window advances

Incidents remain historical records.

---

## Summary

Error budgets:
- Quantify acceptable failure
- Balance velocity and stability
- Enable objective decision-making

They are the foundation of SafeDeploy’s reliability governance.