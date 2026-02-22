import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateDemoService } from "../evaluationService.js";
import * as prometheus from "../../observability/prometheus.js";
import * as incidentStore from "../../incidents/store.js";

vi.mock("../../../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
  },
}));

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

  it("transitions incident to resolved state", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
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

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentState: "resolved",
      }),
    );
  });

  it("saves resolution evidence with correct structure", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
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

    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});
    const evidenceSpy = vi;

    await evaluateDemoService();

    expect(evidenceSpy).toHaveBeenCalledWith(
      "incident-1",
      "resolution.json",
      expect.objectContaining({
        reason: "SLO returned to healthy state after mitigation",
      }),
    );
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

  it("does not resolve mitigated incident for different service", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
    ] as any);

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "incident-1",
        service: "other-app",
        severity: "exhausted",
        currentState: "mitigated",
        timeline: [],
        createdAt: "",
      },
    ] as any);

    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await evaluateDemoService();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("does nothing when no mitigated incidents exist", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
    ] as any);

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);

    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await evaluateDemoService();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("does not resolve already resolved incident", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
    ] as any);

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

    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await evaluateDemoService();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("includes timeline event with system trigger", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] },
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

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        timeline: expect.arrayContaining([
          expect.objectContaining({
            from: "mitigated",
            to: "resolved",
            triggeredBy: "system",
          }),
        ]),
      }),
    );
  });
});
