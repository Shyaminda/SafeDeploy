# Week 02 – Progressive Delivery

## Day 2: Canary Validation, Failure Simulation & Git Rollback

## 1. Objective of Day 2

The goal of Day 2 was not configuration, but validation.

Specifically:

- Prove that a canary can fail safely
- Observe real user-impact signals
- Perform a deterministic rollback using Git only
- Understand post-rollback system behavior

## 2. In-Cluster Traffic Validation Setup

To remove ambiguity caused by browsers, NodePorts, or local networking, all traffic tests were executed from inside the Kubernetes cluster.

A temporary curl pod was used:

```bash
kubectl run curltest \
  --rm -it \
  --image=curlimages/curl \
  --restart=Never \
  -- sh
```

This ensured:

- Kubernetes DNS was used
- Traffic flowed through Services
- Observations reflected real runtime behavior

## 3. Stable vs Canary Baseline Check

From inside the cluster:

```bash
curl http://demo-app-stable:3000/health
curl http://demo-app-canary:3000/health
```

**Initial observation:**

- Both stable and canary responded normally
- Service routing was confirmed correct
- No infrastructure or networking issues existed

This established a clean baseline.

## 4. Intentional Failure Injection (Bad Deployment)

### 4.1 Failure Type Chosen

An artificial latency regression was selected as the failure mode because:

- Pods remain healthy
- Kubernetes does not restart containers
- User impact is clearly observable
- This mirrors common real-world incidents

### 4.2 Application Code Change

A deliberate delay was introduced in the `/health` endpoint:

```typescript
app.get("/health", async (_req, res) => {
  await new Promise((r) => setTimeout(r, 3000));
  res.status(200).json({ status: "ok - Application reached" });
});
```

**Key properties:**

- Infrastructure health remained green
- Only user-facing latency degraded
- Change was fully reversible

## 5. Canary-Only Impact Verification

After the new image was built and synced via GitOps, in-cluster tests were repeated:

```bash
time curl http://demo-app-stable:3000/health
time curl http://demo-app-canary:3000/health
```

**Observed behavior:**

- **Stable:** immediate response
- **Canary:** ~3 second delay

**This confirmed:**

- Canary isolation worked
- Blast radius was limited
- Progressive delivery was functioning correctly

## 6. Git-Driven Rollback Execution

### 6.1 Rollback Method

Rollback was performed only via Git, by reverting the commit that introduced the bad image.

```bash
git revert <bad-release-commit>
```

A merge conflict occurred in:

```
apps/demo-app/rollout.yaml
```

### 6.2 Manual Conflict Resolution

Conflict resolution steps:

1. Retained the previously known good image
2. Removed all conflict markers
3. Completed the revert

```bash
git add apps/demo-app/rollout.yaml
git revert --continue
git push
```

**This validated:**

- Rollback is deterministic
- Human intervention may be required
- Git remains the single control plane

## 7. Post-Rollback System State

### 7.1 Pod State Observation

```bash
kubectl get pods
```

**Observed:**

- 5 pods running with the stable pod-template-hash
- 1 additional pod from rollout history/surge

This behavior was confirmed as expected due to:

- Surge guarantees
- ReplicaSet revision history

> Rollback correctness is defined by traffic flow, not object deletion.

### 7.2 Traffic Verification After Rollback

In-cluster tests repeated:

```bash
curl http://demo-app-stable:3000/health
curl http://demo-app-canary:3000/health
```

**Observed:**

- No latency
- Canary no longer serving degraded behavior
- System fully recovered

## 8. Canary Lifecycle & Rollout Behavior Learnings

Key operational learnings:

- A new canary is created only when `spec.template` changes
- `git revert` does not automatically create a new canary
- Old ReplicaSets and pods may persist for history and safety
- Rollback removes canary from traffic, not from existence

## 9. Promotion vs Rollback Clarification

Two distinct actions were clarified:

| Action        | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| **Rollback**  | Revert image via Git                                        |
| **Promotion** | Complete rollout by removing pause or setting weight to 100 |

**For Week 02:**

- Promotion remains manual
- Automation is intentionally deferred

## 10. Day 2 Outcome Summary

Day 2 conclusively proved that:

- A bad deployment can be introduced safely
- Canary limits the blast radius
- Humans can detect failure
- Rollback works via Git only
- System recovers cleanly without manual Kubernetes mutation

**This completes Week 02 validation.**
