# Week 02 – Progressive Delivery & Canary Rollout

This document records every concrete change made during Week 02, including all YAML changes, controller installation steps, fixes, and behavioral outcomes. This serves as a permanent execution log and architectural evidence that Week 02 objectives were completed correctly.

## 1. Context: Starting Point (End of Week 01)

At the end of Week 01, the system had:

- Kubernetes cluster bootstrapped and validated
- ArgoCD installed and enforcing GitOps
- Demo application deployed as a Deployment
- Single Service exposing the app
- No progressive delivery
- No canary capability

**Week 02 goal:**

Introduce controlled exposure using canary deployments and enforce human decision points.

## 2. Removal of Deployment-Based Workload

### 2.1 Deleted Deployment

**File removed:**

```
apps/demo-app/deployment.yaml
```

**Reason:** Deployment cannot support canary traffic control - Progressive delivery requires a Rollout

This enforces:

- No all-at-once deploys
- No implicit rollout behavior

## 3. Introduction of Argo Rollouts (Execution Plane Upgrade)

### 3.1 Argo Rollouts Controller Installation

Commands executed:

```bash
kubectl create namespace argo-rollouts

kubectl apply -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

### 3.2 Verification

```bash
kubectl get pods -n argo-rollouts
```

**Expected:**

```
argo-rollouts-xxxxx   1/1   Running
```

**Key fix learned:**

- Namespace must exist before applying controller
- Partial installs lead to RBAC crash loops

## 4. Rollout-Based Workload Introduction

### 4.1 New Rollout Manifest

**File added:**

```
apps/demo-app/rollout.yaml
```

Final, working Rollout spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: demo-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      imagePullSecrets:
        - name: ghcr-pull
      containers:
        - name: demo-app
          image: ghcr.io/shyaminda/demo-app:<IMAGE_SHA>
          ports:
            - containerPort: 3000
  strategy:
    canary:
      stableService: demo-app-stable
      canaryService: demo-app-canary
      steps:
        - setWeight: 10
        - pause: {}
```

### 4.2 Meaning of Each Canary Step

| Configuration   | Description                                  |
| --------------- | -------------------------------------------- |
| `replicas: 5`   | Enables meaningful canary approximation      |
| `setWeight: 10` | ~1 pod becomes canary, ~4 pods remain stable |
| `pause: {}`     | Manual gate - No automation proceeds         |

## 5. Service Split (Traffic Isolation)

### 5.1 Stable Service

**File added:**

```
apps/demo-app/service-stable.yaml
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app-stable
spec:
  selector:
    app: demo-app
  ports:
    - port: 3000
      targetPort: 3000
```

### 5.2 Canary Service

**File added:**

```
apps/demo-app/service-canary.yaml
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app-canary
spec:
  selector:
    app: demo-app
  ports:
    - port: 3000
      targetPort: 3000
```

**Important:**

- Selectors are identical
- Argo Rollouts dynamically labels pods

## 6. Kustomize Update

**File modified:**

```
apps/demo-app/kustomization.yaml
```

**Before:**

```yaml
resources:
  - deployment.yaml
  - service.yaml
```

**After:**

```yaml
resources:
  - rollout.yaml
  - service-stable.yaml
  - service-canary.yaml
```

This ensures:

- Deployment is fully removed
- Rollout is the only workload owner

## 7. ArgoCD Observed State

After sync:

- **Application:** Healthy
- **Sync status:** Synced
- **Rollout:** Progressing (Paused)

This is the correct Week 02 terminal state.

## 8. Final Runtime Behavior (Validated)

Observed in cluster:

- 5 pods created
- 4 pods = stable
- 1 pod = canary
- Rollout paused at 10%
- No auto-promotion
- No auto-rollback

**This confirms:**

> Controlled exposure with human authority is enforced.

## 9. Architectural Alignment

This Week 02 implementation directly satisfies:

- Git is the only path to production
- Progressive delivery enforced in execution plane
- Humans retain authority
- Automation is gated

No control-plane automation has been introduced yet.

## 10. Week 02 Completion Status

- ✔ Progressive delivery enabled
- ✔ Canary + stable separation proven
- ✔ Manual decision gate enforced
- ✔ Rollback path ready
- ✔ Execution plane upgraded safely

**Week 02 setup is complete and correct.**

### Next steps (Week 02 validation):

- Simulate bad deployment
- Observe metric degradation
- Roll back via Git
- Write `incident-002-canary-detected.md`

---

_End of Week 02 change log._
