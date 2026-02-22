import { describe, it, expect, vi, beforeEach } from "vitest";
import { proposeRollback } from "../proposeRollback.js";
import * as proposalStore from "../store.js";
import type { Incident } from "../../incidents/incident.js";
import type { ActionProposal } from "../proposal.js";

vi.mock("../../../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("proposeRollback - idempotency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns existing proposal if one already exists", () => {
    const existingProposal: ActionProposal = {
      id: "proposal-1",
      incidentId: "incident-1",
      type: "rollback-rollout",
      status: "proposed",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([
      existingProposal,
    ]);
    const saveSpy = vi.spyOn(proposalStore, "saveProposal");

    const incident: Incident = {
      id: "incident-1",
      service: "demo-app",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: "",
    };

    const result = proposeRollback(
      incident,
      { burnRate: 10, remaining: 0, total: 10, consumed: 10 },
      "reason",
    );

    expect(result).toBe(existingProposal);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("does not treat approved proposal as existing - creates new one", () => {
    const approvedProposal: ActionProposal = {
      id: "proposal-approved",
      incidentId: "incident-1",
      type: "rollback-rollout",
      status: "approved",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([
      approvedProposal,
    ]);
    vi.spyOn(proposalStore, "saveProposal").mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo-app",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: "",
    };

    const result = proposeRollback(
      incident,
      { burnRate: 10, remaining: 0, total: 10, consumed: 10 },
      "reason",
    );

    expect(result).not.toBe(approvedProposal);
    expect(result.status).toBe("proposed");
  });

  it("does not treat rejected proposal as existing - creates new one", () => {
    const rejectedProposal: ActionProposal = {
      id: "proposal-rejected",
      incidentId: "incident-1",
      type: "rollback-rollout",
      status: "rejected",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([
      rejectedProposal,
    ]);
    vi.spyOn(proposalStore, "saveProposal").mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo-app",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: "",
    };

    const result = proposeRollback(
      incident,
      { burnRate: 10, remaining: 0, total: 10, consumed: 10 },
      "reason",
    );

    expect(result).not.toBe(rejectedProposal);
    expect(result.status).toBe("proposed");
  });

  it("does not return proposal for different incident", () => {
    const otherProposal: ActionProposal = {
      id: "proposal-other",
      incidentId: "incident-other",
      type: "rollback-rollout",
      status: "proposed",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([otherProposal]);
    vi.spyOn(proposalStore, "saveProposal").mockImplementation(() => {});

    const incident: Incident = {
      id: "incident-1",
      service: "demo-app",
      severity: "exhausted",
      currentState: "investigating",
      timeline: [],
      createdAt: "",
    };

    const result = proposeRollback(
      incident,
      { burnRate: 10, remaining: 0, total: 10, consumed: 10 },
      "reason",
    );

    expect(result).not.toBe(otherProposal);
    expect(result.incidentId).toBe("incident-1");
  });
});
