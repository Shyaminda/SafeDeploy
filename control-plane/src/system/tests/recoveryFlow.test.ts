import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateDemoService } from "../evaluationService.js";
import * as prometheus from "../../observability/prometheus.js";
import * as incidentStore from "../../incidents/store.js";

describe("Recovery flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves mitigated incident when severity becomes normal", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] }, // healthy latency
    ] as any);

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "incident-1",
        service: "demo-app",
        severity: "exhausted",
        currentState: "mitigated",
        timeline: [],
        createdAt: "",
      },
    ] as any);

    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    await evaluateDemoService();

    expect(saveSpy).toHaveBeenCalled();
  });

  it("does not resolve if incident not mitigated", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
    ] as any);

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

    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await evaluateDemoService();

    expect(saveSpy).not.toHaveBeenCalled();
  });
});
