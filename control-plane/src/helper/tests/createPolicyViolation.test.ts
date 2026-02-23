import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPolicyViolationIncident } from "../createPolicyViolation.js";
import * as incidentStore from "../../incidents/store.js";
import type { PolicyViolation } from "../../policy/policyTypes.js";

vi.mock("../../../../lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("createPolicyViolationIncident", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an incident with policy-violation severity", () => {
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    const violations: PolicyViolation[] = [
      {
        type: "error-budget-exhausted",
        service: "demo-app",
        message: "Budget exhausted",
        blocking: true,
        detectedAt: new Date().toISOString(),
      },
    ];

    const incident = createPolicyViolationIncident(violations);

    expect(incident.service).toBe("demo-app");
    expect(incident.severity).toBe("policy-violation");
    expect(incident.currentState).toBe("investigating");
  });

  it("transitions incident to investigating state", () => {
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    const violations: PolicyViolation[] = [
      {
        type: "missing-owner",
        service: "demo-app",
        message: "No owner",
        blocking: true,
        detectedAt: new Date().toISOString(),
      },
    ];

    const incident = createPolicyViolationIncident(violations);

    expect(incident.currentState).toBe("investigating");
    expect(incident.timeline).toHaveLength(1);
    expect(incident.timeline[0]).toEqual(
      expect.objectContaining({
        from: "detected",
        to: "investigating",
        triggeredBy: "system",
      }),
    );
  });

  it("saves the incident", () => {
    const saveSpy = vi
      .spyOn(incidentStore, "saveIncident")
      .mockImplementation(() => {});

    const violations: PolicyViolation[] = [
      {
        type: "error-budget-exhausted",
        service: "demo-app",
        message: "Budget exhausted",
        blocking: true,
        detectedAt: new Date().toISOString(),
      },
    ];

    createPolicyViolationIncident(violations);

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("generates id with incident-policy prefix", () => {
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    const violations: PolicyViolation[] = [
      {
        type: "error-budget-exhausted",
        service: "demo-app",
        message: "Budget exhausted",
        blocking: true,
        detectedAt: new Date().toISOString(),
      },
    ];

    const incident = createPolicyViolationIncident(violations);

    expect(incident.id).toMatch(/^incident-policy-\d+$/);
  });

  it("logs a warning when policy incident is created", async () => {
    vi.spyOn(incidentStore, "saveIncident").mockImplementation(() => {});

    const { logger } = await import("../../../../lib/logger.js");

    const violations: PolicyViolation[] = [
      {
        type: "error-budget-exhausted",
        service: "demo-app",
        message: "Budget exhausted",
        blocking: true,
        detectedAt: new Date().toISOString(),
      },
    ];

    createPolicyViolationIncident(violations);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("[POLICY INCIDENT]"),
      }),
    );
  });
});
