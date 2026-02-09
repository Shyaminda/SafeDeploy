# Week 03 — Observability Wiring & Prometheus Integration

## Scope of This Document

This document captures everything completed today for Week 03.

This document focuses on:

- Demo application instrumentation
- Prometheus installation and wiring
- ServiceMonitor discovery issues and fixes
- Verification of real metrics flow

## 1. Demo App: Prometheus Instrumentation

### 1.1 Metrics Library

The demo app was instrumented using `prom-client`.

```typescript
import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  buckets: [0.1, 0.3, 0.5, 1, 2, 5], // seconds
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["status"],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
```

### 1.2 Request Middleware

All HTTP requests are measured via middleware.

```typescript
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end();
    httpRequestsTotal.inc({ status: res.statusCode.toString() });
  });
  next();
});
```

### 1.3 Metrics Endpoint

```typescript
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

**Validation:**

- `curl /metrics` returned counters and histogram buckets
- Counters incremented after `/health` requests

## 2. Kubernetes Rollout Adjustments

### 2.1 Named Container Port (Required for Prometheus)

```yaml
ports:
  - name: http
    containerPort: 3000
```

This change is metadata-only and does not affect traffic or rollout behavior.

## 3. Services (Stable & Canary)

### 3.1 Stable Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app-stable
  namespace: default
  labels:
    app: demo-app
spec:
  selector:
    app: demo-app
  ports:
    - name: http
      port: 3000
      targetPort: 3000
```

### 3.2 Canary Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app-canary
  namespace: default
  labels:
    app: demo-app
spec:
  selector:
    app: demo-app
  ports:
    - name: http
      port: 3000
      targetPort: 3000
```

**Key point learned:**

> ServiceMonitor matches Service labels, NOT selectors

## 4. Namespace Preparation

Before installing observability components, the required namespaces were created explicitly.

```bash
kubectl create namespace observability
```

The demo application continued to run in the `default` namespace, while all observability components were isolated into `observability`.

## 5. Prometheus Installation

### 5.1 Helm Installation

```bash
helm install preometheus prometheus-community/kube-prometheus-stack \
  -n observability --create-namespace
```

**Observations:**

- Helm release name: `preometheus` (intentional or accidental, but authoritative)
- All Prometheus-owned resources carry the label `release=preometheus`
- Prometheus, Alertmanager, Grafana, and CRDs were installed in the `observability` namespace

## 6. ServiceMonitor for Demo App

### 6.1 ServiceMonitor Manifest (`demo-app-servicemonitor.yaml`)

A dedicated ServiceMonitor was created to allow Prometheus to scrape the demo application metrics.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: demo-app
  namespace: observability
  labels:
    release: preometheus
spec:
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app: demo-app
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

This manifest was applied manually during setup:

```bash
kubectl apply -f demo-app-servicemonitor.yaml
```

### 6.2 Critical Learnings

- `kube-prometheus-stack` does NOT scrape all ServiceMonitors by default
- Prometheus uses `serviceMonitorSelector.matchLabels` for ownership
- Custom ServiceMonitors must include the Helm release label (`release=preometheus`)
- ServiceMonitors select Service labels, not Pod labels or selectors

## 7. Debugging Timeline (What Was Fixed)

1. Metrics existed in app but not in Prometheus
2. ServiceMonitor existed but not discovered
3. Service labels missing → added `app: demo-app`
4. Label case mismatch (`App` vs `app`) → fixed
5. Prometheus still ignored ServiceMonitor
6. Root cause identified: missing `release: preometheus` label
7. After adding label → target appeared as UP

## 8. Prometheus Verification

### 8.1 Targets Page

- `serviceMonitor/observability/demo-app/0` appeared
- State: **UP**

### 8.2 Valid PromQL Queries

```promql
http_requests_total
```

```promql
rate(http_requests_total[1m])
```

```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

### 8.3 Histogram Clarification

- `http_request_duration_seconds` does NOT exist
- Correct metrics are:
  - `*_bucket`
  - `*_count`
  - `*_sum`

## 9. Control Plane Connectivity

Prometheus is reachable inside the cluster via:

```
http://prometheus-operated.observability:9090
```

This endpoint is:

- Cluster-internal
- Stable
- Correct for SafeDeploy control plane usage

## 10. Prometheus Access via Port Forwarding (Operator Access)

During setup and debugging, Prometheus was accessed securely via port forwarding. This method exposes Prometheus only to the operator machine, without changing cluster networking.

### 10.1 Server-Side Port Forward

Executed on the Kubernetes server:

```bash
kubectl port-forward svc/prometheus-operated -n observability 9090
```

**Result:**

- Prometheus UI bound to `127.0.0.1:9090` on the server
- No Service exposure (no NodePort / LoadBalancer)

### 10.2 Remote Access via SSH Tunnel

Since the cluster runs on a remote server, an SSH tunnel was required.

Executed on the local machine:

```bash
ssh -L 9090:localhost:9090 shyami@<SERVER_IP>
```

This created the following path:

```
Browser (localhost:9090)
  → SSH tunnel
    → Server localhost:9090
      → kubectl port-forward
        → Prometheus Service
```

### 10.3 Validation

After both tunnels were active:

```
http://localhost:9090
```

- Prometheus UI loaded successfully
- Targets and metrics were visible

### 10.4 Security Rationale

- Prometheus was never exposed publicly
- No firewall or Service changes were required

This aligns with the principle:

> Observability endpoints are cluster-internal and operator-accessed only.

## 11. Final State at End of Day

- ✔ Demo app emits real user-centric metrics
- ✔ Prometheus scrapes demo app successfully
- ✔ ServiceMonitor discovery fully understood
- ✔ Histogram behavior clearly understood
- ✔ Execution plane validated for SLO-based decisions

## Week 03 Status

**Execution plane observability is now correct and trusted.**

### Next steps (future work):

- Formal SLI definitions
- SLO targets
- Error budget calculation
- Decision logic in SafeDeploy control plane
