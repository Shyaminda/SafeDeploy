import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateDemoService } from "../evaluationService.js";
import * as prometheus from "../../observability/prometheus.js";
import * as incidentStore from "../../incidents/store.js";

vi.mock("../../../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../audit/store.js", () => ({
  appendAudit: vi.fn(),
}));

vi.mock("../../health-state/store.js", () => ({
  loadServiceHealthState: vi.fn(() => null),
  saveServiceHealthState: vi.fn(),
}));

vi.mock("../../helper/freezeWindow.js", () => ({
  unfreezeIfExpired: vi.fn(),
  updateFreezeWindow: vi.fn(),
}));

vi.mock("../../helper/initializeBudgetWindow.js", () => ({
  initializeOrRotateWindow: vi.fn(() => ({
    service: "demo-app",
    windowStart: new Date().toISOString(),
    allowed: 10,
    consumedSoFar: 0,
  })),
}));

vi.mock("../../budget-state/store.js", () => ({
  saveBudgetWindow: vi.fn(),
}));

vi.mock("../../catalog/catalogStore.js", () => ({
  loadService: vi.fn(() => ({
    name: "demo-app",
    owner: "platform-team",
    slos: [{ name: "latency-p95-300ms", target: 0.999 }],
    deploymentStrategy: "canary",
    rollbackStrategy: "git-revert",
    runbookUrl: "https://internal/runbooks/demo-app",
    costBudget: 100,
  })),
}));

vi.mock("../../helper/createPolicyViolation.js", () => ({
  createPolicyViolationIncident: vi.fn(() => ({
    id: "incident-policy-mock",
    service: "demo-app",
    severity: "policy-violation",
    currentState: "investigating",
    timeline: [],
    createdAt: new Date().toISOString(),
  })),
}));

vi.mock("../../actions/proposeBlockPromotion.js", () => ({
  proposeBlockPromotion: vi.fn(),
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

  it("logs resolution audit when incident is resolved", async () => {
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

    const { appendAudit } = await import("../../audit/store.js");

    await evaluateDemoService();

    expect(appendAudit).toHaveBeenCalledWith(
      "incidents",
      expect.objectContaining({
        incidentId: "incident-1",
        state: "resolved",
        resolved: true,
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
