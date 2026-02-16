import { handleProposalApproval } from "./handleApproval.js";

const proposalId = process.argv[2];

if (!proposalId) {
  console.error("Provide proposal ID");
  process.exit(1);
}

handleProposalApproval(proposalId);

console.log("Approval handled");
