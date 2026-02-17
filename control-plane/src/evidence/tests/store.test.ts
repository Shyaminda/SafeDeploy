import { describe, it, expect } from "vitest";
import { saveEvidence } from "../store.js";
import fs from "fs";

describe("saveEvidence", () => {
  it("creates evidence file in correct directory", () => {
    const incidentId = "incident-test";
    const filename = "decision.json";

    saveEvidence(incidentId, filename, { test: true });

    const exists = fs.existsSync(`evidence/${incidentId}/${filename}`);

    expect(exists).toBe(true);
  });
});
