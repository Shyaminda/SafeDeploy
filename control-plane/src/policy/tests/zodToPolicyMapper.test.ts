import { describe, it, expect } from "vitest";
import { mapZodIssuesToPolicyViolations } from "../zodToPolicyMapper.js";
import type * as z from "zod";

describe("mapZodIssuesToPolicyViolations", () => {
  it("maps owner field to missing-owner violation", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        message: "Required",
        path: ["owner"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations).toHaveLength(1);
    expect(violations[0]!.type).toBe("missing-owner");
    expect(violations[0]!.service).toBe("demo-app");
    expect(violations[0]!.blocking).toBe(true);
  });

  it("maps slos field to missing-slo violation", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "too_small",
        message: "Array must contain at least 1 element",
        path: ["slos"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations[0]!.type).toBe("missing-slo");
  });

  it("maps rollbackStrategy field to missing-rollback-strategy violation", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "invalid_type",
        message: "Required",
        path: ["rollbackStrategy"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations[0]!.type).toBe("missing-rollback-strategy");
  });

  it("maps deploymentStrategy field to no-canary-strategy violation", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "invalid_enum_value",
        message: "Invalid enum value",
        path: ["deploymentStrategy"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations[0]!.type).toBe("no-canary-strategy");
  });

  it("maps unknown fields to restricted-window violation", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "invalid_type",
        message: "Required",
        path: ["unknownField"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations[0]!.type).toBe("restricted-window");
  });

  it("maps multiple issues to multiple violations", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "invalid_type",
        message: "Required",
        path: ["owner"],
      } as any,
      {
        code: "too_small",
        message: "Array must contain at least 1 element",
        path: ["slos"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations).toHaveLength(2);
    expect(violations[0]!.type).toBe("missing-owner");
    expect(violations[1]!.type).toBe("missing-slo");
  });

  it("joins nested paths in message", () => {
    const issues: z.core.$ZodIssue[] = [
      {
        code: "invalid_type",
        message: "Required",
        path: ["slos", 0, "name"],
      } as any,
    ];

    const violations = mapZodIssuesToPolicyViolations(issues, "demo-app");

    expect(violations[0]!.message).toContain("slos.0.name");
  });
});
