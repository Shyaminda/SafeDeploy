import { loadProposals, saveProposal } from "./store.js";
import type { ActionProposal } from "./proposal.js";
import type { PolicyViolation } from "../policy/policyTypes.js";

export function proposeBlockPromotion(
  incidentId: string,
  service: string,
  violations: PolicyViolation[],
): ActionProposal {
  const existing = loadProposals().find(
    (p) =>
      p.type === "block-promotion" &&
      p.status === "proposed" &&
      p.incidentId === incidentId,
  );

  if (existing) {
    return existing;
  }

  const proposal: ActionProposal = {
    id: `proposal-${Date.now()}`,
    incidentId,
    type: "block-promotion",
    createdAt: new Date().toISOString(),
    status: "proposed",
    justification: {
      severity: "policy-violation",
      explanation: "Promotion blocked due to policy violations",
      evidence: {
        slo: violations[0]?.type ?? "unknown",
        burnRate: 0,
        remainingBudget: 0,
      },
    },
  };

  saveProposal(proposal);

  return proposal;
}
