import { describe, it, expect, vi, beforeEach } from "vitest";
import { proposeRollback } from "../proposeRollback.js";
import * as proposalStore from "../store.js";
import type { Incident } from "../../incidents/incident.js";
import type { ActionProposal } from "../proposal.js";

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
});
