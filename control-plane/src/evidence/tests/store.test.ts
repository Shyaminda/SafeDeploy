import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveEvidence } from "../store.js";
import fs from "fs";
import path from "path";

vi.mock("fs");

describe("saveEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("creates evidence directory with recursive option", () => {
    const mkdirSpy = vi
      .spyOn(fs, "mkdirSync")
      .mockImplementation(() => undefined);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    saveEvidence("incident-123", "decision.json", { test: true });

    expect(mkdirSpy).toHaveBeenCalledWith(
      path.resolve("evidence", "incident-123"),
      { recursive: true },
    );
  });

  it("writes file to correct path", () => {
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    saveEvidence("incident-123", "decision.json", { test: true });

    const expectedPath = path.join(
      path.resolve("evidence", "incident-123"),
      "decision.json",
    );
    expect(writeSpy).toHaveBeenCalledWith(expectedPath, expect.any(String));
  });

  it("serializes data as formatted JSON", () => {
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    const data = { key: "value", nested: { count: 42 } };
    saveEvidence("incident-123", "test.json", data);

    const expectedJson = JSON.stringify(data, null, 2);
    expect(writeSpy).toHaveBeenCalledWith(expect.any(String), expectedJson);
  });

  it("handles different filenames for same incident", () => {
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    saveEvidence("incident-123", "proposal.json", { type: "proposal" });
    saveEvidence("incident-123", "approval.json", { type: "approval" });

    expect(writeSpy).toHaveBeenCalledTimes(2);
    expect(writeSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("proposal.json"),
      expect.any(String),
    );
    expect(writeSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("approval.json"),
      expect.any(String),
    );
  });

  it("handles different incident IDs", () => {
    const mkdirSpy = vi
      .spyOn(fs, "mkdirSync")
      .mockImplementation(() => undefined);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    saveEvidence("incident-001", "data.json", {});
    saveEvidence("incident-002", "data.json", {});

    expect(mkdirSpy).toHaveBeenCalledWith(
      path.resolve("evidence", "incident-001"),
      { recursive: true },
    );
    expect(mkdirSpy).toHaveBeenCalledWith(
      path.resolve("evidence", "incident-002"),
      { recursive: true },
    );
  });
});
