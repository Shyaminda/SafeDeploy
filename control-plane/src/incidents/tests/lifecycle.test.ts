import { describe, it, expect } from "vitest";
import { transitionIncident } from "../lifecycle.js";
import type { Incident } from "../incident.js";

describe("transitionIncident", () => {
  it("transitions state correctly", () => {
    const incident: Incident = {
      id: "test",
      service: "demo",
      severity: "fast-burn",
      currentState: "detected",
      timeline: [],
      createdAt: new Date().toISOString(),
    };

    const updated = transitionIncident(
      incident,
      "investigating",
      "Testing transition",
      "system",
    );

    expect(updated.currentState).toBe("investigating");
    expect(updated.timeline.length).toBe(1);
    expect(updated.timeline[0]?.from).toBe("detected");
    expect(updated.timeline[0]?.to).toBe("investigating");
  });
});
