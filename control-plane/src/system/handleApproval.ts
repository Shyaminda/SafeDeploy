import { approveProposal } from "../actions/approveProposal.js";
import { loadIncidents, saveIncident } from "../incidents/store.js";
import { transitionIncident } from "../incidents/lifecycle.js";

export function handleProposalApproval(proposalId: string): void {
  const proposal = approveProposal(proposalId);

  if (proposal.status !== "approved") {
    return;
  }

  const incidents = loadIncidents();
  const incident = incidents.find((i) => i.id === proposal.incidentId);

  if (!incident) {
    throw new Error("Incident not found for proposal");
  }

  if (incident.currentState !== "investigating") {
    return;
  }

  const mitigated = transitionIncident(
    incident,
    "mitigated",
    `Proposal ${proposal.id} approved`,
    "user",
  );

  saveIncident(mitigated);
}
