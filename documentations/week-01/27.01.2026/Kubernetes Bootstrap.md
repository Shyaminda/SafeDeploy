# Week 01 – Kubernetes Bootstrap & Registry Setup (With Commands)

This document summarizes everything completed today, starting from Kubernetes installation up to running an in-cluster container registry, with the exact commands and YAML used. This represents the bootstrap phase of the SafeDeploy platform.

---

## 1. Kubernetes Cluster Bootstrap

### Goal

Establish a clean Kubernetes execution plane with no application intelligence, suitable for GitOps enforcement later.

### Commands Executed

```bash
# Disable swap (required by Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Install prerequisites
sudo apt-get update
sudo apt-get install -y apt-transport-https curl ca-certificates gpg

# Install containerd
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null

# Enable systemd cgroups (critical)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl enable containerd

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
sudo bash -c "echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf"
sudo sysctl --system
```

### Kubernetes Installation

```bash
# Add Kubernetes repository
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key \
  | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
  https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" \
  | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

### Cluster Initialization

```bash
sudo kubeadm init
```

Configure kubectl for the admin user:

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Install Calico CNI:

```bash
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml
```

---

## 2. Single-Node Cluster Decision

### Action

Allow workloads on the control-plane node.

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

---

## 3. Kubernetes User Access Setup

### Existing Linux Users

- shyami
- nipun
- buthsara

### Commands Used

```bash
for user in nipun buthsara; do
  sudo mkdir -p /home/$user/.kube
  sudo cp /etc/kubernetes/admin.conf /home/$user/.kube/config
  sudo chown -R $user:$user /home/$user/.kube
done
```

Verification (run as each user):

```bash
kubectl get nodes
```

---

## 4. Docker vs containerd Clarification

### Observed Behavior

```bash
docker ps
# Cannot connect to the Docker daemon
```

### Explanation

- Docker daemon is not running
- Kubernetes uses containerd, not Docker

Verification:

```bash
sudo systemctl status containerd
kubectl get nodes
```

---

## 5. In-Cluster Container Registry (Bootstrap Infra)

### Namespace Creation

```bash
kubectl create namespace infra
```

### Registry Deployment (`registry.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry
  namespace: infra
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry
  template:
    metadata:
      labels:
        app: registry
    spec:
      containers:
        - name: registry
          image: registry:2
          ports:
            - containerPort: 5000
```

Apply:

```bash
kubectl apply -f registry.yaml
```

### Registry Service (`registry-service.yaml`)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: registry
  namespace: infra
spec:
  type: NodePort
  selector:
    app: registry
  ports:
    - protocol: TCP
      port: 5000
      targetPort: 5000
      nodePort: 32000
```

Apply:

```bash
kubectl apply -f registry-service.yaml
```

---

## 6. Registry Validation

```bash
kubectl get pods -n infra
kubectl get svc -n infra
```

Test registry API:

```bash
curl http://localhost:32000/v2/_catalog
```

Expected:

```json
{"repositories":[]}
```

### 6.1 Pushing Demo App Image to In-Cluster Registry

#### Build Image (on build machine or server)

```bash
docker build -t demo-app:1.0.0 .
```

#### Tag Image for In-Cluster Registry

If building on the same server:

```bash
docker tag demo-app:1.0.0 localhost:32000/demo-app:1.0.0
```

If building from a remote machine:

```bash
docker tag demo-app:1.0.0 <NODE_IP>:32000/demo-app:1.0.0
```

#### Push Image to Registry

```bash
docker push localhost:32000/demo-app:1.0.0
# or
docker push <NODE_IP>:32000/demo-app:1.0.0
```

#### Verify Image Exists in Registry

```bash
curl http://localhost:32000/v2/_catalog
```

Expected:

```json
{"repositories":["demo-app"]}
```

---

## 7. Planned Next Step – containerd Registry Trust

### Required Configuration

```toml
[plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:32000"]
  endpoint = ["http://localhost:32000"]
```

Apply with:

```bash
sudo vi /etc/containerd/config.toml
sudo systemctl restart containerd
```

---

## 8. Runtime Validation – Image Pull Smoke Test (Pre-ArgoCD)

### Purpose

Before installing ArgoCD, we explicitly validated the execution plane by proving that containerd can successfully pull images from the in-cluster registry.

This avoids false failures later where GitOps appears broken but the runtime is misconfigured.

### Step 8.1 – Create a Temporary Image Pull Test Pod

This pod is manual, disposable, and NOT GitOps-managed.

Create the file:

```bash
vi image-pull-test.yaml
```

Contents:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: image-pull-test
spec:
  containers:
    - name: test
      image: localhost:32000/demo-app:1.0.0
      ports:
        - containerPort: 3000
  restartPolicy: Never
```

Apply it:

```bash
kubectl apply -f image-pull-test.yaml
```

### Step 8.2 – Verify Image Pull Success

```bash
kubectl get pod image-pull-test
```

Expected result:

```
STATUS: Running
```

Failure indicators:
- `ImagePullBackOff`
- `ErrImagePull`

If failures occur, the containerd registry trust configuration must be fixed before proceeding.

### Step 8.3 – Cleanup (Mandatory Discipline)

Once validated:

```bash
kubectl delete pod image-pull-test
rm image-pull-test.yaml
```

**Rationale:** Manual resources must not remain in the cluster once validation is complete.

---

## 9. ArgoCD Installation – Transition to GitOps Enforcement

This step marks the end of bootstrap and the start of enforced GitOps control.

### Step 9.1 – Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait until all components are ready:

```bash
kubectl get pods -n argocd
```

All pods must be in `Running` state.

### Step 9.2 – Access ArgoCD UI (Temporary Admin Access)

There are two valid access scenarios depending on where `kubectl port-forward` is executed.

#### Case 1 – Running directly on the server

If you are logged into the Kubernetes node itself:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then open in a browser on that same machine:

```
https://localhost:8080
```

#### Case 2 – Running on a remote server (most common)

In this case, `localhost` refers to the server, not your laptop. You must use SSH port forwarding.

Below is the correct, end-to-end workflow with explicit ports.

**Correct workflow (step-by-step, no guessing)**

**1. On your laptop (Windows)**

Open CMD / PowerShell and run:

```bash
ssh -p 2222 -L 8080:localhost:8080 shyami@100.87.63.125
```

- `-p 2222` → SSH port of the server
- `-L 8080:localhost:8080` → forwards laptop:8080 → server:8080

Keep this terminal OPEN.

**2. Inside that SSH session (on the server)**

Run:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

You should see:

```
Forwarding from 127.0.0.1:8080 -> 8080
```

Leave this running.

**3. On your laptop browser**

Open:

```
https://localhost:8080
```

- Ignore the TLS warning
- ArgoCD UI should load successfully

### Login Credentials

- **Username:** `admin`
- **Password:**

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

---

## Current State Summary

| Component              | Status           |
|------------------------|------------------|
| Kubernetes             | Installed & Ready |
| Runtime (containerd)   | Running          |
| Networking (Calico)    | Working          |
| Registry (in-cluster)  | Running          |
| Image Pull Validation  | Verified         |
| ArgoCD                 | Installed        |
| Demo App (GitOps)      | Not deployed     |

---

## Key Principle Reinforced

> **Validate execution first. Enforce intent only after runtime trust is proven.**

---

## End of Day Summary – Week 01 (Bootstrap → Enforcement Transition)