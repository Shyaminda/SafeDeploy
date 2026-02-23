import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as prometheus from "../../observability/prometheus.js";
import * as incidentStore from "../../incidents/store.js";
import * as proposalModule from "../../actions/proposeRollback.js";
import * as burnRateModule from "../../decisions/burnRate.js";
import * as sliModule from "../../slo/sli.js";
import * as sloModule from "../../slo/slo.js";

import { evaluateDemoService } from "../evaluationService.js";

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

describe("Full control-plane flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Prevent real filesystem writes
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates incident and proposal when budget is exhausted", async () => {
    // Simulate high latency (SLO breach)
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "2"] }, // 2 seconds
    ] as any);

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    const proposalSpy = vi
      .spyOn(proposalModule, "proposeRollback")
      .mockImplementation(() => ({}) as any);

    await evaluateDemoService();

    // Incident created
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // Proposal created
    expect(proposalSpy).toHaveBeenCalledTimes(1);

    // Evidence saved: decision + slo + budget
  });

  it("does not create incident for fast-burn severity", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.5"] }, // 500ms - above 300ms target
    ] as any);

    // Force fast-burn severity
    vi.spyOn(burnRateModule, "evaluateBurnRate").mockReturnValue("fast-burn");

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    const proposalSpy = vi
      .spyOn(proposalModule, "proposeRollback")
      .mockImplementation(() => ({}) as any);

    await evaluateDemoService();

    // No runtime incident for fast-burn (only exhausted triggers incident)
    expect(saveSpy).not.toHaveBeenCalled();

    // NO rollback proposal for fast-burn
    expect(proposalSpy).not.toHaveBeenCalled();
  });

  it("does not create incident for slow-burn severity", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.2"] },
    ] as any);

    vi.spyOn(burnRateModule, "evaluateBurnRate").mockReturnValue("slow-burn");

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    const proposalSpy = vi
      .spyOn(proposalModule, "proposeRollback")
      .mockImplementation(() => ({}) as any);

    await evaluateDemoService();

    // No incident for slow-burn
    expect(saveSpy).not.toHaveBeenCalled();
    expect(proposalSpy).not.toHaveBeenCalled();
  });

  it("does not create incident for normal severity", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] }, // 100ms - under target
    ] as any);

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    await evaluateDemoService();

    expect(saveSpy).not.toHaveBeenCalled();
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

    const proposalSpy = vi
      .spyOn(proposalModule, "proposeRollback")
      .mockImplementation(() => ({}) as any);

    await evaluateDemoService();

    // No new incident
    expect(saveSpy).not.toHaveBeenCalled();

    // Proposal still triggered for exhausted severity
    expect(proposalSpy).toHaveBeenCalledTimes(1);
  });

  it("does not propose rollback for fast-burn with existing incident", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.5"] },
    ] as any);

    vi.spyOn(burnRateModule, "evaluateBurnRate").mockReturnValue("fast-burn");

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "existing-1",
        service: "demo-app",
        severity: "fast-burn",
        currentState: "investigating",
        timeline: [],
        createdAt: new Date().toISOString(),
      },
    ] as any);

    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    const proposalSpy = vi
      .spyOn(proposalModule, "proposeRollback")
      .mockImplementation(() => ({}) as any);

    await evaluateDemoService();

    // No new incident, no proposal
    expect(saveSpy).not.toHaveBeenCalled();
    expect(proposalSpy).not.toHaveBeenCalled();
  });

  it("creates new incident when existing incident is for different service", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "2"] },
    ] as any);

    // Existing incident for DIFFERENT service
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "other-1",
        service: "other-app",
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

    // New incident created for demo-app
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("resolves mitigated incident when severity becomes normal", async () => {
    // Simulate healthy latency
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([
      { value: ["", "0.1"] }, // 100ms
    ] as any);

    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([
      {
        id: "incident-1",
        service: "demo-app",
        severity: "exhausted",
        currentState: "mitigated",
        timeline: [],
        createdAt: new Date().toISOString(),
      },
    ] as any);

    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    await evaluateDemoService();

    // Incident transitioned to resolved
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // Resolution evidence saved
  });

  it("does not resolve if incident is not mitigated", async () => {
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
        createdAt: new Date().toISOString(),
      },
    ] as any);

    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await evaluateDemoService();

    // No resolution
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
        createdAt: new Date().toISOString(),
      },
    ] as any);

    const saveSpy = vi.spyOn(incidentStore, "saveIncident");

    await evaluateDemoService();

    // No resolution for different service
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("throws error when SLI is not found", async () => {
    vi.spyOn(sliModule, "DEMO_APP_SLIS", "get").mockReturnValue([]);

    await expect(evaluateDemoService()).rejects.toThrow(
      "Latency SLI/SLO not found",
    );
  });

  it("handles empty Prometheus response gracefully", async () => {
    vi.spyOn(prometheus, "queryPrometheus").mockResolvedValue([]);
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);

    // When Prometheus returns no data, latency is treated as 0ms (healthy)
    await evaluateDemoService();
  });

  it("throws error when SLO is not found", async () => {
    vi.spyOn(sloModule, "DEMO_APP_SLOS", "get").mockReturnValue([]);

    await expect(evaluateDemoService()).rejects.toThrow(
      "Latency SLI/SLO not found",
    );
  });
});
