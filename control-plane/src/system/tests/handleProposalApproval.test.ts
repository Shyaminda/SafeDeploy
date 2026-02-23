import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProposalApproval } from "../handleProposalApproval.js";
import * as proposalModule from "../../actions/approveProposal.js";
import * as incidentStore from "../../incidents/store.js";
import * as gitModule from "../../actions/git/prepareRollbackCommit.js";
import * as prModule from "../../actions/git/createRollbackPR.js";

vi.mock("../../audit/store.js", () => ({
  appendAudit: vi.fn(),
}));

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

    await handleProposalApproval("proposal-1");

    expect(gitModule.prepareRollbackCommit).toHaveBeenCalled();
    expect(prModule.createRollbackPR).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
  });

  it("calls prepareRollbackCommit with correct arguments", async () => {
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

    const gitSpy = vi
      .spyOn(gitModule, "prepareRollbackCommit")
      .mockResolvedValue(undefined);
    vi.spyOn(prModule, "createRollbackPR").mockResolvedValue("http://pr-url");
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    await handleProposalApproval("proposal-1");

    expect(gitSpy).toHaveBeenCalledWith("55fccf8", "rollback-incident-1");
  });

  it("calls createRollbackPR with correct arguments", async () => {
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
    const prSpy = vi
      .spyOn(prModule, "createRollbackPR")
      .mockResolvedValue("http://pr-url");
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    await handleProposalApproval("proposal-1");

    expect(prSpy).toHaveBeenCalledWith(
      "rollback-incident-1",
      "Rollback incident-1",
      "Automated rollback proposal",
      "Triggered by proposal proposal-1",
    );
  });

  it("logs approval audit with correct structure", async () => {
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
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    const { appendAudit } = await import("../../audit/store.js");

    await handleProposalApproval("proposal-1");

    expect(appendAudit).toHaveBeenCalledWith(
      "proposals",
      expect.objectContaining({
        type: "proposal-approved",
        proposalId: "proposal-1",
        approvedBy: "user",
      }),
    );
  });

  it("transitions incident with PR URL in reason", async () => {
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

    await handleProposalApproval("proposal-1");

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentState: "mitigated",
        timeline: expect.arrayContaining([
          expect.objectContaining({
            to: "mitigated",
            reason: expect.stringContaining("http://pr-url"),
          }),
        ]),
      }),
    );
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

  it("throws error when incident not found", async () => {
    vi.spyOn(proposalModule, "approveProposal").mockReturnValue({
      id: "proposal-1",
      incidentId: "incident-nonexistent",
      status: "approved",
      type: "rollback-rollout",
      createdAt: "",
      justification: {} as any,
    });

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);

    await expect(handleProposalApproval("proposal-1")).rejects.toThrow(
      "Incident not found for proposal",
    );
  });

  it("does not create PR if incident is not investigating", async () => {
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
        currentState: "mitigated", // Not investigating
        timeline: [],
        createdAt: "",
      },
    ] as any);

    const gitSpy = vi.spyOn(gitModule, "prepareRollbackCommit");
    const prSpy = vi.spyOn(prModule, "createRollbackPR");
    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await handleProposalApproval("proposal-1");

    expect(gitSpy).not.toHaveBeenCalled();
    expect(prSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("does not create PR if incident is resolved", async () => {
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
        currentState: "resolved",
        timeline: [],
        createdAt: "",
      },
    ] as any);

    const prSpy = vi.spyOn(prModule, "createRollbackPR");

    await handleProposalApproval("proposal-1");

    expect(prSpy).not.toHaveBeenCalled();
  });
});
