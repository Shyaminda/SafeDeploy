import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProposalApproval } from "../handleProposalApproval.js";
import * as proposalModule from "../../actions/approveProposal.js";
import * as incidentStore from "../../incidents/store.js";
import * as gitModule from "../../actions/git/prepareRollbackCommit.js";
import * as prModule from "../../actions/git/createRollbackPR.js";
import * as evidence from "../../evidence/store.js";

describe("handleProposalApproval", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates PR and transitions incident to mitigated", async () => {
    vi.spyOn(proposalModule, "approveProposal").mockReturnValue({
      id: "proposal-1",
      incidentId: "incident-1",
      status: "approved",
      type: "rollback-rollout",
      createdAt: "",
      justification: {} as any,
    });

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "incident-1",
        service: "demo-app",
        severity: "exhausted",
        currentState: "investigating",
        timeline: [],
        createdAt: "",
      },
    ] as any);

    vi.spyOn(gitModule, "prepareRollbackCommit").mockResolvedValue(undefined);
    vi.spyOn(prModule, "createRollbackPR").mockResolvedValue("http://pr-url");

    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});
    const evidenceSpy = vi
      .spyOn(evidence, "saveEvidence")
      .mockImplementation(() => {});

    await handleProposalApproval("proposal-1");

    expect(gitModule.prepareRollbackCommit).toHaveBeenCalled();
    expect(prModule.createRollbackPR).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
    expect(evidenceSpy).toHaveBeenCalled(); // approval evidence
  });

  it("does nothing if proposal not approved", async () => {
    vi.spyOn(proposalModule, "approveProposal").mockReturnValue({
      id: "proposal-1",
      incidentId: "incident-1",
      status: "proposed",
      type: "rollback-rollout",
      createdAt: "",
      justification: {} as any,
    });

    const prSpy = vi.spyOn(prModule, "createRollbackPR");

    await handleProposalApproval("proposal-1");

    expect(prSpy).not.toHaveBeenCalled();
  });
});
