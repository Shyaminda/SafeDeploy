import { describe, it, expect, vi, beforeEach } from "vitest";
import { proposeRollback } from "../proposeRollback.js";
import * as store from "../store.js";
import * as evidenceStore from "../../evidence/store.js";
import type { Incident } from "../../incidents/incident.js";
import type { ActionProposal } from "../proposal.js";

vi.mock("../../../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("proposeRollback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a rollback proposal with correct structure", () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});
    vi.spyOn(evidenceStore, "saveEvidence").mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: new Date().toISOString(),
    };

    const budget = {
      total: 10,
      remaining: 0,
      consumed: 10,
      burnRate: 10,
    };

    const proposal = proposeRollback(incident, budget, "Budget exhausted");

    expect(proposal.incidentId).toBe("incident-1");
    expect(proposal.type).toBe("rollback-rollout");
    expect(proposal.status).toBe("proposed");
    expect(proposal.justification).toEqual({
      severity: "exhausted",
      explanation: "Budget exhausted",
      evidence: {
        slo: "latency-p95-300ms",
        burnRate: 10,
        remainingBudget: 0,
      },
    });
  });

  it("saves proposal and evidence when creating new proposal", () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);
    const saveProposalSpy = vi
      .spyOn(store, "saveProposal")
      .mockImplementation(() => {});
    const saveEvidenceSpy = vi
      .spyOn(evidenceStore, "saveEvidence")
      .mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: new Date().toISOString(),
    };

    const budget = {
      total: 10,
      remaining: 0,
      consumed: 10,
      burnRate: 10,
    };

    const proposal = proposeRollback(incident, budget, "Budget exhausted");

    expect(saveProposalSpy).toHaveBeenCalledWith(proposal);
    expect(saveEvidenceSpy).toHaveBeenCalledWith(
      "incident-1",
      "proposal.json",
      proposal,
    );
  });

  it("returns existing proposal if one already exists for the incident", () => {
    const existingProposal: ActionProposal = {
      id: "proposal-existing",
      incidentId: "incident-1",
      type: "rollback-rollout",
      status: "proposed",
      createdAt: new Date().toISOString(),
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([existingProposal]);
    const saveProposalSpy = vi
      .spyOn(store, "saveProposal")
      .mockImplementation(() => {});
    const saveEvidenceSpy = vi
      .spyOn(evidenceStore, "saveEvidence")
      .mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: new Date().toISOString(),
    };

    const budget = {
      total: 10,
      remaining: 0,
      consumed: 10,
      burnRate: 10,
    };

    const result = proposeRollback(incident, budget, "Budget exhausted");

    expect(result).toBe(existingProposal);
    expect(saveProposalSpy).not.toHaveBeenCalled();
    expect(saveEvidenceSpy).not.toHaveBeenCalled();
  });

  it("creates new proposal if existing proposal has different status", () => {
    const approvedProposal: ActionProposal = {
      id: "proposal-approved",
      incidentId: "incident-1",
      type: "rollback-rollout",
      status: "approved",
      createdAt: new Date().toISOString(),
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([approvedProposal]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});
    vi.spyOn(evidenceStore, "saveEvidence").mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: new Date().toISOString(),
    };

    const budget = {
      total: 10,
      remaining: 0,
      consumed: 10,
      burnRate: 10,
    };

    const result = proposeRollback(incident, budget, "Budget exhausted");

    expect(result.id).not.toBe("proposal-approved");
    expect(result.status).toBe("proposed");
  });
});
