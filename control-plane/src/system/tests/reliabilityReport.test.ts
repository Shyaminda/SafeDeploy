import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReliabilityReport } from "../reliabilityReport.js";
import * as catalogStore from "../../catalog/catalogStore.js";
import * as incidentStore from "../../incidents/store.js";
import * as budgetStore from "../../budget-state/store.js";
import * as healthStore from "../../health-state/store.js";
import * as proposalStore from "../../actions/store.js";

describe("generateReliabilityReport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no services exist", () => {
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([]);
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);

    const report = generateReliabilityReport();

    expect(report).toEqual([]);
  });

  it("returns service report with budget info", () => {
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue({
      service: "demo-app",
      windowStart: "2026-01-01T00:00:00.000Z",
      allowed: 10,
      consumedSoFar: 3,
    });
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);

    const report = generateReliabilityReport();

    expect(report).toHaveLength(1);
    expect(report[0]).toEqual(
      expect.objectContaining({
        service: "demo-app",
        owner: "platform-team",
        budget: {
          allowed: 10,
          consumed: 3,
          remaining: 7,
          windowStart: "2026-01-01T00:00:00.000Z",
        },
      }),
    );
  });

  it("returns null budget when no budget window exists", () => {
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);

    const report = generateReliabilityReport();

    expect(report[0].budget).toBeNull();
  });

  it("includes active incident info", () => {
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
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
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);

    const report = generateReliabilityReport();

    expect(report[0].activeIncident).toEqual({
      id: "incident-1",
      state: "investigating",
      severity: "exhausted",
    });
  });

  it("does not include resolved incidents as active", () => {
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
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
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);

    const report = generateReliabilityReport();

    expect(report[0].activeIncident).toBeNull();
  });

  it("includes active proposals for the service", () => {
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
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
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([
      {
        id: "proposal-1",
        incidentId: "incident-1",
        type: "rollback-rollout",
        status: "proposed",
        createdAt: "",
        justification: {} as any,
      },
    ]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);

    const report = generateReliabilityReport();

    expect(report[0].activeProposals).toEqual([
      { id: "proposal-1", type: "rollback-rollout", status: "proposed" },
    ]);
  });

  it("reports freeze window status", () => {
    const futureFreeze = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
      service: "demo-app",
      lastEvaluatedAt: new Date().toISOString(),
      lastExhaustedAt: new Date().toISOString(),
      freezeUntil: futureFreeze,
    });

    const report = generateReliabilityReport();

    expect(report[0].freeze.active).toBeTruthy();
    expect(report[0].freeze.freezeUntil).toBe(futureFreeze);
  });

  it("reports no active freeze when freeze has expired", () => {
    const pastFreeze = new Date(Date.now() - 1000).toISOString();
    vi.spyOn(catalogStore, "loadCatalog").mockReturnValue([
      {
        name: "demo-app",
        owner: "platform-team",
        slos: [{ name: "latency-p95-300ms", target: 0.999 }],
        deploymentStrategy: "canary",
        rollbackStrategy: "git-revert",
        runbookUrl: "https://test.com",
      },
    ]);
    vi.spyOn(incidentStore, "loadIncidents").mockReturnValue([]);
    vi.spyOn(proposalStore, "loadProposals").mockReturnValue([]);
    vi.spyOn(budgetStore, "loadBudgetWindow").mockReturnValue(null);
    vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
      service: "demo-app",
      lastEvaluatedAt: new Date().toISOString(),
      lastExhaustedAt: new Date().toISOString(),
      freezeUntil: pastFreeze,
    });

    const report = generateReliabilityReport();

    expect(report[0].freeze.active).toBeFalsy();
  });
});
