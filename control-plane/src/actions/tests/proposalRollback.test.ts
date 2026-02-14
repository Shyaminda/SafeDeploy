import { describe, it, expect } from "vitest";
import { proposeRollback } from "../proposeRollback.js";
import type { Incident } from "../../incidents/incident.js";

describe("proposeRollback", () => {
  it("creates a rollback proposal with correct structure", () => {
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
  });
});
