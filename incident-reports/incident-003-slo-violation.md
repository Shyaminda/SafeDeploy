# Incident 003 — Latency SLO Violation and Recovery

## Summary
A latency regression caused the demo service to violate its p95 latency Service Level Objective (SLO),
resulting in rapid error budget exhaustion. SafeDeploy detected the violation using SLO-based
evaluation and justified a rollback decision based on user impact. After corrective action, the
service recovered and returned to SLO-compliant operation.

---

## Detection

- **SLI**: Request latency (p95)
- **SLO**: p95 latency < 300ms
- **Observed Degradation**: p95 latency ≈ 3.9s
- **Evaluation Result**: SLO violation detected

SafeDeploy evaluated externally observed latency metrics via Prometheus and identified sustained
latency far exceeding the defined SLO threshold.

---

## Decision

- **Error Budget State**: Exhausted
- **Burn Rate**: Critically high (budget consumed significantly faster than allowed)
- **Severity Classification**: `exhausted`

Based on error budget exhaustion, SafeDeploy determined that the service was operating outside its
reliability contract. Continued exposure under these conditions would result in unacceptable and
sustained user impact.

The decision was derived exclusively from SLO evaluation and error budget analysis, without relying
on infrastructure-level metrics or symptoms.

---

## Action

A rollback was justified based on the SLO violation and error budget exhaustion.
The corrective action was executed via Git, restoring the service to a previously known
SLO-compliant version.

No direct production mutations were performed outside the GitOps workflow.

---

## Recovery Observation

Following the corrective action:

- Observed p95 latency returned to within the defined SLO threshold.
- Error budget consumption stabilized.
- SafeDeploy evaluations transitioned from `exhausted` back to `normal`.

This confirmed that the user-facing impact had been resolved and the service had re-entered
SLO-compliant operation.

---

## Learning

- Latency regressions can fully exhaust error budgets without causing request failures.
- Error budgets correctly model both degradation and recovery when evaluated over rolling windows.
- Canary deployments must be evaluated against latency SLOs prior to promotion.
- SLO-based decision-making provides clearer and safer rollback justification than
infrastructure- or symptom-based alerts.

---

## Outcome

The service is currently operating within SLO.
No further user impact has been observed since recovery.
