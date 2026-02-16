# Incident 004 — Guarded Automated Rollback via Git

## Summary

A canary deployment introduced user-visible latency regression. SafeDeploy detected SLO exhaustion, opened an incident, proposed a rollback via Git, required human approval, generated a pull request, and verified recovery automatically.

This incident validates Week 04: Operational Control & Guarded Automation.

---

## Environment Context

### Execution Plane
- Kubernetes (single-node cluster)
- ArgoCD (GitOps enforcement)
- Argo Rollouts (canary controller)

### Observability Layer
- Prometheus (kube-prometheus-stack)
- ServiceMonitor for demo-app
- P95 latency SLI

### Control Plane
- TypeScript modular monolith
- Error budget evaluation
- Incident lifecycle engine
- Proposal system
- Git PR generation

---

## Triggering Event

A new image was deployed via Git to the canary.

The `/health` endpoint was modified to introduce ~3000ms latency.

Argo Rollouts state:

```
setWeight: 10
pause: {}
```

10% of traffic routed to canary.

---

## Observed Metrics

PromQL used:

```
histogram_quantile(
  0.95,
  sum by (le)(
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

Observed:
- P95 latency exceeded 300ms SLO
- Error budget rapidly consumed
- Remaining budget reached 0

Severity evaluated as:

```
exhausted
```

Console output:

```
[DECISION] severity=exhausted | reason=Error budget exhausted; service is operating outside SLO.
```

---

## Incident Lifecycle

### Creation

SafeDeploy automatically created:

```
incident-XXXX.json
```

Initial state:

```
detected → investigating
```

Evidence stored:

```
evidence/incident-XXXX/
  decision.json
  slo.json
  budget.json
```

---

## Action Proposal

Since severity was `exhausted`, SafeDeploy generated:

```
proposal-XXXX.json
```

Type:

```
rollback-rollout
```

Proposal contained:
- Burn rate
- Remaining budget
- SLO definition
- Decision explanation

No direct Kubernetes mutation occurred.

---

## Human Approval

Manual command executed:

```
node manualProposalApproval.js proposal-XXXX
```

Effects:

1. Proposal status → approved
2. Approval evidence saved
3. Git branch created:
   ```
   rollback-incident-XXXX
   ```
4. Rollout image reverted to known good SHA
5. Pull request opened to `main`

PR contained:
- Explicit rollback commit
- Incident reference
- Automated explanation

SafeDeploy did NOT merge the PR.

Human retained final authority.

---

## Git as Actuator

After PR merge:

ArgoCD detected manifest change.

Execution Plane reconciled desired state.

Argo Rollouts:
- Promoted stable pods
- Removed degraded canary from traffic

No kubectl was executed by SafeDeploy.

---

## Recovery Detection

On next evaluation cycle:

```
severity = normal
```

SafeDeploy detected:

- Incident state = mitigated
- SLO returned within bounds

Transition executed:

```
mitigated → resolved
```

Resolution evidence stored:

```
resolution.json
```

No human intervention required for recovery detection.

---

## Final Incident State

Lifecycle timeline:

```
detected
→ investigating
→ mitigated
→ resolved
```

All transitions:
- Explicit
- Timestamped
- Explainable
- Evidence-backed

---

## Architectural Validation

This incident proves:

### 1. Decisions ≠ Actions
SafeDeploy proposed rollback. It did not execute directly.

### 2. Git is the Actuator
All production change flowed through Git PR.

### 3. Humans Approve Irreversible Change
PR required manual merge.

### 4. Observability Drives Decisions
SLO + error budget triggered action.

### 5. Automation is Bounded
No direct cluster mutation.

### 6. Learning is Persistent
All artifacts stored in:

```
incidents/
evidence/
action-proposals/
```

---

## Lessons Learned

- Canary isolation limited blast radius.
- SLO-driven detection is superior to alert-based detection.
- Git-mediated rollback provides safe automation.
- Incident lifecycle enables controlled recovery.
- Recovery detection closes the operational loop.

---

## Week 04 Completion Statement

SafeDeploy can now:

- Detect unsafe deployments
- Create structured incidents
- Propose corrective actions
- Require human approval
- Encode actions via Git
- Observe recovery automatically
- Persist evidence immutably

Operational control is now governed, not reactive.

Week 04 is complete.

