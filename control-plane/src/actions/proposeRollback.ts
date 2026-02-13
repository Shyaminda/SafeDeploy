import type { Incident } from "../incidents/incident.js";
import type { ErrorBudget } from "../slo/errorBudget.js";
import type { ActionProposal } from "./proposal.js";
import { saveProposal } from "./store.js";

export function proposeRollback(
  incident: Incident,
  budget: ErrorBudget,
  explanation: string,
) {
  const proposal: ActionProposal = {
    id: `proposal-${Date.now()}`,
    incidentId: incident.id,
    type: "rollback-rollout",
    createdAt: new Date().toISOString(),
    status: "proposed",
    justification: {
      severity: incident.severity,
      explanation,
      evidence: {
        slo: "latency-p95-300ms",
        burnRate: budget.burnRate,
        remainingBudget: budget.remaining,
      },
    },
  };

  saveProposal(proposal);

  console.log(`[PROPOSAL] ${proposal.id} proposed rollback for ${incident.id}`);
}
