import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as prometheus from "../../observability/prometheus.js";
import * as incidentStore from "../../incidents/store.js";
import * as proposalModule from "../../actions/proposeRollback.js";
import { evaluateDemoService } from "../evaluationService.js";

describe("Full control-plane flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates incident and proposal when budget is exhausted", async () => {
    // Mock Prometheus to simulate bad latency
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "2"] }, // High latency to force SLO breach
    ] as any);

    // Prevent real file system writes
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);

    // Spy on rollback proposal
    const proposalSpy = vi
      .spyOn(proposalModule, "proposeRollback")
      .mockImplementation(() => ({}) as any);

    // Run the system
    await evaluateDemoService();

    // Assertions
    expect(incidentStore.saveIncident).toHaveBeenCalledTimes(1);
    expect(proposalSpy).toHaveBeenCalledTimes(1);
  });

  it("does not create duplicate incident if active one exists", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "2"] },
    ] as any);

    // Simulate existing active incident
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "existing-1",
        service: "demo-app",
        severity: "exhausted",
        currentState: "investigating",
        timeline: [],
        createdAt: new Date().toISOString(),
      },
    ] as any);

    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    await evaluateDemoService();

    expect(saveSpy).not.toHaveBeenCalled();
  });
});
