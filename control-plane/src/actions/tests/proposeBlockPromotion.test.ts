import { describe, it, expect, vi, beforeEach } from "vitest";
import { proposeBlockPromotion } from "../proposeBlockPromotion.js";
import * as store from "../store.js";
import type { ActionProposal } from "../proposal.js";
import type { PolicyViolation } from "../../policy/policyTypes.js";
import type { ErrorBudget } from "../../slo/errorBudget.js";

vi.mock("../../audit/store.js", () => ({
  appendAudit: vi.fn(),
}));

describe("proposeBlockPromotion", () => {
  const violations: PolicyViolation[] = [
    {
      type: "error-budget-exhausted",
      service: "demo-app",
      message: "Budget exhausted",
      blocking: true,
      detectedAt: new Date().toISOString(),
    },
  ];

  const budget: ErrorBudget = {
    total: 10,
    remaining: 0,
    consumed: 10,
    burnRate: 10,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a block-promotion proposal with correct structure", () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});

    const proposal = proposeBlockPromotion(
      "incident-1",
      "demo-app",
      violations,
      budget,
    );

    expect(proposal.incidentId).toBe("incident-1");
    expect(proposal.type).toBe("block-promotion");
    expect(proposal.status).toBe("proposed");
    expect(proposal.justification).toEqual({
      severity: "policy-violation",
      explanation: "Promotion blocked due to policy violations",
      evidence: {
        slo: "error-budget-exhausted",
        burnRate: 10,
        remainingBudget: 0,
      },
    });
  });

  it("saves proposal when creating new proposal", () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);
    const saveSpy = vi
      .spyOn(store, "saveProposal")
      .mockImplementation(() => {});

    const proposal = proposeBlockPromotion(
      "incident-1",
      "demo-app",
      violations,
      budget,
    );

    expect(saveSpy).toHaveBeenCalledWith(proposal);
  });

  it("returns existing proposal if one already exists for the incident", () => {
    const existingProposal: ActionProposal = {
      id: "proposal-existing",
      incidentId: "incident-1",
      type: "block-promotion",
      status: "proposed",
      createdAt: new Date().toISOString(),
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([existingProposal]);
    const saveSpy = vi
      .spyOn(store, "saveProposal")
      .mockImplementation(() => {});

    const result = proposeBlockPromotion(
      "incident-1",
      "demo-app",
      violations,
      budget,
    );

    expect(result).toBe(existingProposal);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("creates new proposal if existing one has different status", () => {
    const approvedProposal: ActionProposal = {
      id: "proposal-approved",
      incidentId: "incident-1",
      type: "block-promotion",
      status: "approved",
      createdAt: new Date().toISOString(),
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([approvedProposal]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});

    const result = proposeBlockPromotion(
      "incident-1",
      "demo-app",
      violations,
      budget,
    );

    expect(result.id).not.toBe("proposal-approved");
    expect(result.status).toBe("proposed");
  });

  it("creates new proposal if existing is for different incident", () => {
    const otherProposal: ActionProposal = {
      id: "proposal-other",
      incidentId: "incident-other",
      type: "block-promotion",
      status: "proposed",
      createdAt: new Date().toISOString(),
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([otherProposal]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});

    const result = proposeBlockPromotion(
      "incident-1",
      "demo-app",
      violations,
      budget,
    );

    expect(result).not.toBe(otherProposal);
    expect(result.incidentId).toBe("incident-1");
  });

  it("uses 'unknown' slo when violations array is empty", () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});

    const result = proposeBlockPromotion("incident-1", "demo-app", [], budget);

    expect(result.justification.evidence.slo).toBe("unknown");
  });

  it("logs audit on proposal creation", async () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);
    vi.spyOn(store, "saveProposal").mockImplementation(() => {});

    const { appendAudit } = await import("../../audit/store.js");

    proposeBlockPromotion("incident-1", "demo-app", violations, budget);

    expect(appendAudit).toHaveBeenCalledWith(
      "proposals",
      expect.objectContaining({
        type: "proposal-created",
        service: "demo-app",
        action: "block-promotion",
      }),
    );
  });

  it("logs audit on proposal reuse", async () => {
    const existingProposal: ActionProposal = {
      id: "proposal-existing",
      incidentId: "incident-1",
      type: "block-promotion",
      status: "proposed",
      createdAt: new Date().toISOString(),
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([existingProposal]);

    const { appendAudit } = await import("../../audit/store.js");

    proposeBlockPromotion("incident-1", "demo-app", violations, budget);

    expect(appendAudit).toHaveBeenCalledWith(
      "proposals",
      expect.objectContaining({
        type: "proposal-reused",
        proposalId: "proposal-existing",
      }),
    );
  });
});
