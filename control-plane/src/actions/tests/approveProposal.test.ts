import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveProposal } from "../approveProposal.js";
import * as store from "../store.js";
import type { ActionProposal } from "../proposal.js";

describe("approveProposal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("changes proposal status to approved", () => {
    const proposal: ActionProposal = {
      id: "p1",
      incidentId: "i1",
      type: "rollback-rollout",
      status: "proposed",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([proposal]);
    const updateSpy = vi
      .spyOn(store, "updateProposal")
      .mockImplementation(() => {});

    const result = approveProposal("p1");

    expect(result.status).toBe("approved");
    expect(updateSpy).toHaveBeenCalledWith(proposal);
  });

  it("throws error when proposal is not found", () => {
    vi.spyOn(store, "loadProposals").mockReturnValue([]);

    expect(() => approveProposal("nonexistent")).toThrow("Proposal not found");
  });

  it("returns existing proposal if already approved without updating", () => {
    const proposal: ActionProposal = {
      id: "p1",
      incidentId: "i1",
      type: "rollback-rollout",
      status: "approved",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([proposal]);
    const updateSpy = vi
      .spyOn(store, "updateProposal")
      .mockImplementation(() => {});

    const result = approveProposal("p1");

    expect(result.status).toBe("approved");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("returns existing proposal if already rejected without updating", () => {
    const proposal: ActionProposal = {
      id: "p1",
      incidentId: "i1",
      type: "rollback-rollout",
      status: "rejected",
      createdAt: "",
      justification: {} as any,
    };

    vi.spyOn(store, "loadProposals").mockReturnValue([proposal]);
    const updateSpy = vi
      .spyOn(store, "updateProposal")
      .mockImplementation(() => {});

    const result = approveProposal("p1");

    expect(result.status).toBe("rejected");
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
