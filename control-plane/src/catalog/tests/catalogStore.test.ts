import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { loadCatalog, loadService } from "../catalogStore.js";

describe("catalogStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validService = {
    name: "demo-app",
    owner: "platform-team",
    slos: [{ name: "latency-p95-300ms", target: 0.999 }],
    deploymentStrategy: "canary",
    rollbackStrategy: "git-revert",
    runbookUrl: "https://internal/runbooks/demo-app",
    costBudget: 100,
  };

  describe("loadCatalog", () => {
    it("loads and validates services from catalog directory", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue(["demo-app.json"] as any);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(validService),
      );

      const services = loadCatalog();

      expect(services).toHaveLength(1);
      expect(services[0]!.name).toBe("demo-app");
    });

    it("throws when catalog directory does not exist", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      expect(() => loadCatalog()).toThrow("Catalog directory not found");
    });

    it("ignores non-JSON files", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "demo-app.json",
        "readme.md",
      ] as any);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(validService),
      );

      const services = loadCatalog();

      expect(services).toHaveLength(1);
    });

    it("throws ZodError for invalid service definition", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue(["bad.json"] as any);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify({ name: "bad" }), // Missing required fields
      );

      expect(() => loadCatalog()).toThrow();
    });
  });

  describe("loadService", () => {
    it("returns the matching service by name", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue(["demo-app.json"] as any);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(validService),
      );

      const service = loadService("demo-app");

      expect(service.name).toBe("demo-app");
    });

    it("throws when service is not found", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue(["demo-app.json"] as any);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(validService),
      );

      expect(() => loadService("nonexistent")).toThrow(
        "Service 'nonexistent' not found in catalog",
      );
    });
  });
});
