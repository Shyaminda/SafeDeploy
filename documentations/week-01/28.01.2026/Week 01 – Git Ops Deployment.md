# Week 01 – GitOps Deployment

This document records the actions performed today, in the exact order, starting from GitOps enforcement and ArgoCD handoff.

## 1. Repository Structure for GitOps

Inside `safeDeploy-environment` (a.k.a. `production-environment`), the following structure was created to enforce GitOps separation:

```
production-environment/
├── apps/
│   └── demo-app/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml
├── argocd/
│   └── demo-app.yaml
└── README.md
```

This repository contains only Kubernetes and GitOps configuration.
No application source code exists here.

## 2. Demo Application Manifests (Git Source of Truth)

### Deployment

**File:** `production-environment/apps/demo-app/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
        - name: demo-app
          image: localhost:32000/demo-app:1.0.0
          ports:
            - containerPort: 3000
```

### Service

**File:** `production-environment/apps/demo-app/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app
  namespace: default
spec:
  type: NodePort
  selector:
    app: demo-app
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 32080
```

This exposes the demo app externally for testing.

### Kustomization

**File:** `production-environment/apps/demo-app/kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

Kustomize is used to ensure ArgoCD can render the workload deterministically.

## 3. ArgoCD Application (GitOps Handoff Point)

This file represents the handoff of control from humans to ArgoCD.

**File:** `production-environment/argocd/demo-app.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: "https://github.com/Shyaminda/safeDeploy-environment.git"
    targetRevision: feature/development
    path: apps/demo-app
  destination:
    server: "https://kubernetes.default.svc"
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Once applied, all deployments must flow through Git.

## 4. Applying the ArgoCD Application (Server Side)

### Working Directory

```bash
cd ~
# optional but clean
mkdir -p argocd
cd argocd
```

### Create the Application file

```bash
vi demo-app.yaml
```

Paste the ArgoCD Application manifest exactly as defined above, then save.

### Apply the Application

```bash
kubectl apply -f demo-app.yaml
```

### Verification

```bash
kubectl get applications -n argocd
```

## 5. Kubernetes Failure & Recovery (Swap Issue)

### Root Cause

Kubelet failed because swap was enabled, which Kubernetes does not support.

### Permanent Fix

Edit `/etc/fstab`:

```bash
sudo vi /etc/fstab
```

Find:

```
/swap.img none swap sw 0 0
```

Comment it out:

```
# /swap.img none swap sw 0 0
```

### Restart kubelet

```bash
sudo systemctl restart kubelet
sudo systemctl status kubelet
```

**Expected:**

```
Active: active (running)
```

### Confirm Control Plane Recovery

```bash
kubectl get nodes
```

**Expected:**

```
NAME             STATUS   ROLES           AGE   VERSION
devops-server    Ready    control-plane   ...
```

## 6. ArgoCD Git Repository Authentication (Private Repo)

Because `safeDeploy-environment` is private, ArgoCD required explicit Git credentials.

### Required GitHub PAT Permissions

Fine-grained PAT configuration:

**Repository access:**

- ✅ Only selected repositories
  - `safeDeploy-environment`

**Repository permissions:**

| Permission | Access                  |
| ---------- | ----------------------- |
| Contents   | ✅ Read                 |
| Metadata   | ✅ Read (auto-required) |

No other permissions were required.

### Create ArgoCD Repository Secret

```bash
kubectl create secret generic argocd-safedeploy-environment \
  -n argocd \
  --from-literal=type=git \
  --from-literal=url=https://github.com/shyaminda/safeDeploy-environment \
  --from-literal=username=shyaminda \
  --from-literal=password=<YOUR_GITHUB_PAT> \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Label the secret (mandatory)

```bash
kubectl label secret argocd-safedeploy-environment \
  -n argocd \
  argocd.argoproj.io/secret-type=repository
```

### Restart ArgoCD Repo Server

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
kubectl get pods -n argocd
```

## 7. ArgoCD Sync & Deployment Result

After correcting Git state and performing a Hard Refresh in ArgoCD:

- Deployment was created
- ReplicaSet was created
- Pod entered `Running` state

```bash
kubectl get pods -n default
```

```
demo-app-xxxxx   1/1   Running
```

## 8. Final State (End of Today's Work)

- Git is the only source of truth
- ArgoCD enforces desired state
- Kubernetes only executes
- Manual deployment is no longer possible
- Demo app is running and accessible via NodePort

## Closing Statement

This concludes today's GitOps deployment work.

The deployment path is now fully controlled by Git and ArgoCD, satisfying the Week 01 objective:

> "All production changes flow through GitOps, and Kubernetes is only an execution engine."
