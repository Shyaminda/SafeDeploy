# Service Level Indicators (SLIs)

## Purpose

This document defines the **Service Level Indicators (SLIs)** used by SafeDeploy in Week 03.
SLIs represent **what users actually experience**, not what infrastructure reports.

SLIs are defined **about a service**, not inside the service.

---

## What an SLI Is

An SLI is a **quantitative measurement of user experience**.

Examples:
- How fast responses are
- How often requests succeed

SLIs:
- Are externally observed
- Are derived from telemetry systems (Prometheus)
- Do not rely on infrastructure metrics

---

## What SLIs Are Not

SLIs are **not**:
- CPU usage
- Memory consumption
- Pod health
- Restart counts

Those are symptoms, not user experience.

---

## SLIs Used in Week 03

### 1. Request Latency (p95)

**Definition**:

> The 95th percentile of request latency observed over a rolling time window.

**User Meaning**:
- 95% of users receive responses faster than this value
- The slowest 5% represent tail latency and user pain

**Prometheus Query**:

```promql
histogram_quantile(
  0.95,
  sum by (le)(
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

**Unit**: seconds (converted to milliseconds inside SafeDeploy)

---

### 2. Request Success Rate (Conceptual)

**Definition**:

> Percentage of requests that complete successfully.

**Status in Week 03**:
- Defined conceptually
- Not fully wired into the evaluation pipeline

This SLI will be used in later stages to model availability-based SLOs.

---

## Design Principles

- SLIs must be user-centric
- SLIs must be observable without application modification
- SLIs must be stable enough to form contracts

---

## Summary

SLIs define **what SafeDeploy observes**.
They form the foundation for SLOs, error budgets, and decision-making.

Without correct SLIs, all downstream decisions are invalid.