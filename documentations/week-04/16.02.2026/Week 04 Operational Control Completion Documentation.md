# Week 04 – Operational Control & Guarded Automation

## 1. Overview

Week 04 transforms SafeDeploy from a decision engine into a governed operational control plane.

By the end of this phase, SafeDeploy:

- Detects SLO violations
- Manages incident lifecycle state
- Generates action proposals
- Enforces human approval
- Executes only via Git
- Preserves execution-plane isolation
- Captures structured audit evidence
- Detects recovery and resolves incidents automatically

This fulfills the architectural promise:

> SafeDeploy can safely initiate and govern operational actions, while humans remain in control.

## 2. Incident Lifecycle Engine (Day 1 Continuation)

### States Implemented

- `detected`
- `investigating`
- `mitigated`
- `resolved`
- `postmortem-complete`

Transitions are:

- Explicit
- Timestamped
- Reasoned
- Triggered by system or user

## 3. Action Proposal Engine

### 3.1 Proposal Model

```typescript
export type ActionType = "rollback-rollout" | "promote-canary";

export interface ActionProposal {
  id: string;
  incidentId: string;
  type: ActionType;
  createdAt: string;
  justification: {
    severity: string;
    explanation: string;
    evidence: {
      slo: string;
      burnRate: number;
      remainingBudget: number;
    };
  };
  status: "proposed" | "approved" | "rejected";
}
```

**Design principles:**

- Proposals are inert
- Proposals do not execute
- Approval required before action
- Status governs behavior

## 4. Proposal Deduplication

To prevent infinite proposal creation:

```typescript
const existing = loadProposals().find(
  (p) =>
    p.incidentId === incident.id &&
    p.type === "rollback-rollout" &&
    p.status === "proposed",
);

if (existing) {
  return existing;
}
```

**Result:**

- Idempotent proposal generation
- Single active proposal per incident

## 5. Human Approval Workflow

### 5.1 Approval Logic

```typescript
export function approveProposal(id: string): ActionProposal {
  const proposals = loadProposals();
  const proposal = proposals.find((p) => p.id === id);

  if (!proposal) {
    throw new Error("Proposal not found");
  }

  proposal.status = "approved";
  updateProposal(proposal);
  return proposal;
}
```

Approval updates intent only.

### 5.2 Manual Approval Command

Approval is triggered via CLI:

```bash
node dist/control-plane/src/system/manualProposalApproval.js proposal-1771243870264
```

This simulates human governance.

### 5.3 What Happens on Approval

1. Proposal marked `approved`
2. `approval.json` evidence stored
3. Git branch created
4. Rollout image updated
5. Commit created
6. Branch pushed
7. Pull request opened
8. Incident transitioned to `mitigated`

**Example console output:**

```
PR created: https://github.com/Shyaminda/safeDeploy-environment/pull/12
Approval handled successfully
```

## 6. Git-Mediated Rollback (Multi-Repo Model)

### 6.1 Environment Configuration

```env
ENV_REPO_URL=https://github.com/Shyaminda/safeDeploy-environment.git
ENV_REPO_PATH=.runtime/safeDeploy-environment
ENV_BASE_BRANCH=main
```

### 6.2 Repo Manager

```typescript
export async function ensureEnvRepo(): Promise<string> {
  const repoPath = path.resolve(process.env.ENV_REPO_PATH!);
  const repoUrl = process.env.ENV_REPO_URL!;

  if (!fs.existsSync(repoPath)) {
    await simpleGit().clone(repoUrl, repoPath);
  }

  return repoPath;
}
```

### 6.3 Rollback Commit Preparation

```typescript
export async function prepareRollbackCommit(
  imageTag: string,
  branchName: string,
) {
  const repoPath = await ensureEnvRepo();
  const git = simpleGit(repoPath);

  await git.checkout(process.env.ENV_BASE_BRANCH!);
  await git.pull("origin", process.env.ENV_BASE_BRANCH!);
  await git.checkoutLocalBranch(branchName);

  const rolloutPath = path.join(repoPath, "apps/demo-app/rollout.yaml");

  const content = fs.readFileSync(rolloutPath, "utf-8");
  const updated = content.replace(
    /image:\s*ghcr\.io\/shyaminda\/demo-app:.*/,
    `image: ghcr.io/shyaminda/demo-app:${imageTag}`,
  );

  fs.writeFileSync(rolloutPath, updated);

  await git.add(rolloutPath);
  await git.commit(`Rollback to image ${imageTag}`);
  await git.push("origin", branchName);
}
```

### 6.4 Pull Request Creation

```typescript
export async function createRollbackPR(
  branchName: string,
  prTitle: string,
  prBody: string,
) {
  const response = await client.post("/pulls", {
    title: prTitle,
    head: branchName,
    base: process.env.ENV_BASE_BRANCH,
    body: prBody,
  });

  return response.data.html_url;
}
```

**PR format:**

```
rollback-incident-XXXX → main
```

Git remains the only actuator.

## 7. Recovery Detection & Resolution

Inside evaluation loop:

```typescript
if (severity === "normal") {
  const mitigatedIncident = incidents.find(
    (i) => i.service === "demo-app" && i.currentState === "mitigated",
  );

  if (mitigatedIncident) {
    const resolved = transitionIncident(
      mitigatedIncident,
      "resolved",
      "SLO returned to healthy state after mitigation",
      "system",
    );

    saveIncident(resolved);
    saveEvidence(resolved.id, "resolution.json", {
      resolvedAt: new Date().toISOString(),
      reason: "SLO returned to healthy state",
    });
  }
}
```

Lifecycle becomes complete.

## 8. Evidence & Audit Trail

### Folder Structure

```
evidence/
  incident-XXXX/
    decision.json
    slo.json
    budget.json
    proposal.json
    approval.json
    resolution.json
```

### Evidence Utility

```typescript
export function saveEvidence(
  incidentId: string,
  filename: string,
  data: unknown,
): void {
  const folder = path.resolve("evidence", incidentId);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, filename), JSON.stringify(data, null, 2));
}
```

**Guarantees:**

- Decisions are reproducible
- Actions are explainable
- Audit trail preserved
- Automation is bounded and transparent

## 9. Full Operational Control Loop

```
Canary Deployment
→ SLO Burn Detected
→ Incident Created
→ Rollback Proposal Generated
→ Human Executes CLI Approval
→ Git Branch Created
→ Pull Request Opened
→ PR Merged
→ Argo Reconciliation
→ Recovery Detected
→ Incident Resolved
```

- No direct Kubernetes mutation.
- No Argo API calls.
- Git remains the single actuator.

## 10. Week 04 Completion Status

### Completed:

- Incident Lifecycle Engine
- Action Proposal Engine
- Proposal Deduplication
- Human Approval Workflow
- Git-Mediated Rollback
- Multi-Repo Isolation
- Recovery Detection
- Structured Evidence System

SafeDeploy has evolved from:

> A decision engine

into:

> A governed, stateful, Git-mediated operational control plane.

## End of Week 04 Documentation

SafeDeploy now enforces:

- Decisions ≠ actions
- All actions require Git
- Humans approve irreversible changes
- Automation is bounded and auditable
- Learning updates future decisions

**Week 04 is architecturally complete.**
