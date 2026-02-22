# Service Level Objectives (SLOs)

## Purpose

This document defines the **Service Level Objectives (SLOs)** enforced by SafeDeploy in Week 03.

SLOs convert raw signals (SLIs) into **explicit reliability contracts**.

---

## What an SLO Is

An SLO is a **promise made to users** about the quality of service they can expect.

It defines:

- What level of degradation is acceptable
- When the system is considered unhealthy
- How much failure is tolerated

---

## Relationship Between SLIs and SLOs

- SLIs measure reality
- SLOs define acceptable bounds of that reality

An SLO always references a specific SLI.

---

## SLOs Defined in Week 03

### Latency SLO

**Name**: `latency-p95-300ms`

**Definition**:

> p95 request latency must remain below 300ms

**Rationale**:

- Latency above 300ms is perceptible to users
- Sustained tail latency degrades trust and usability

**Evaluation Window**: 30 days

---

## What Happens When an SLO Is Violated

When an SLO is violated:

- Requests exceeding the threshold are classified as **bad events**
- Error budget is consumed
- Burn rate increases
- Decision severity escalates

SLO violations do not automatically cause outages, but they **restrict further risk-taking**.

---

## Why SLOs Are Explicit

Without SLOs:

- Health is subjective
- Decisions are debated
- Risk tolerance is unclear

With SLOs:

- Health is measurable
- Decisions are justifiable
- Trade-offs are explicit

---

## Summary

SLOs define **what “healthy” means** for SafeDeploy.
They are the reference point for error budgets and all decision logic.
