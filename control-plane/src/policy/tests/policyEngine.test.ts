import { describe, it, expect } from "vitest";
import { evaluateServicePolicies } from "../policyEngine.js";
import type { ServiceDefinition } from "../../catalog/serviceDefinition.js";

describe("evaluateServicePolicies", () => {
  const validService: ServiceDefinition = {
    name: "demo-app",
    owner: "platform-team",
    slos: [{ name: "latency-p95-300ms", target: 0.999 }],
    deploymentStrategy: "canary",
    rollbackStrategy: "git-revert",
    runbookUrl: "https://internal/runbooks/demo-app",
    costBudget: 100,
  };

  it("returns no violations for a valid service with healthy budget", () => {
    const violations = evaluateServicePolicies(validService, true);
    expect(violations).toHaveLength(0);
  });

  it("flags missing owner", () => {
    const service = { ...validService, owner: "" };
    const violations = evaluateServicePolicies(service, true);
    expect(violations).toContainEqual(
      expect.objectContaining({
        type: "missing-owner",
        blocking: true,
      }),
    );
  });

  it("flags missing SLOs", () => {
    const service = { ...validService, slos: [] };
    const violations = evaluateServicePolicies(service, true);
    expect(violations).toContainEqual(
      expect.objectContaining({
        type: "missing-slo",
        blocking: true,
      }),
    );
  });

  it("flags missing rollback strategy", () => {
    const service = { ...validService, rollbackStrategy: "" as any };
    const violations = evaluateServicePolicies(service, true);
    expect(violations).toContainEqual(
      expect.objectContaining({
        type: "missing-rollback-strategy",
        blocking: true,
      }),
    );
  });

  it("flags exhausted error budget", () => {
    const violations = evaluateServicePolicies(validService, false);
    expect(violations).toContainEqual(
      expect.objectContaining({
        type: "error-budget-exhausted",
        blocking: true,
      }),
    );
  });

  it("flags non-canary deployment strategy", () => {
    const service = {
      ...validService,
      deploymentStrategy: "blue-green" as const,
    };
    const violations = evaluateServicePolicies(service, true);
    expect(violations).toContainEqual(
      expect.objectContaining({
        type: "no-canary-strategy",
        blocking: true,
      }),
    );
  });

  it("returns multiple violations when service has several issues", () => {
    const service: ServiceDefinition = {
      name: "bad-service",
      owner: "",
      slos: [],
      deploymentStrategy: "blue-green",
      rollbackStrategy: "" as any,
      runbookUrl: "",
    };

    const violations = evaluateServicePolicies(service, false);

    const types = violations.map((v) => v.type);
    expect(types).toContain("missing-owner");
    expect(types).toContain("missing-slo");
    expect(types).toContain("missing-rollback-strategy");
    expect(types).toContain("error-budget-exhausted");
    expect(types).toContain("no-canary-strategy");
  });
});
