import { describe, it, expect } from "vitest";
import { transitionIncident } from "../lifecycle.js";
import type { Incident } from "../incident.js";

describe("transitionIncident", () => {
  const createIncident = (overrides?: Partial<Incident>): Incident => ({
    id: "test",
    service: "demo",
    severity: "fast-burn",
    currentState: "detected",
    timeline: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  it("transitions state correctly", () => {
    const incident = createIncident();

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

  it("records triggeredBy and reason in timeline event", () => {
    const incident = createIncident();

    const updated = transitionIncident(
      incident,
      "mitigated",
      "Issue resolved",
      "user",
    );

    expect(updated.timeline[0]?.triggeredBy).toBe("user");
    expect(updated.timeline[0]?.reason).toBe("Issue resolved");
  });

  it("records timestamp in timeline event", () => {
    const incident = createIncident();
    const before = new Date().toISOString();

    const updated = transitionIncident(
      incident,
      "investigating",
      "reason",
      "system",
    );

    const after = new Date().toISOString();
    const eventTime = updated.timeline[0]?.at;

    expect(eventTime).toBeDefined();
    expect(eventTime! >= before).toBe(true);
    expect(eventTime! <= after).toBe(true);
  });

  it("accumulates events in timeline for multiple transitions", () => {
    const incident = createIncident();

    const first = transitionIncident(
      incident,
      "investigating",
      "Started investigating",
      "system",
    );

    const second = transitionIncident(
      first,
      "mitigated",
      "Applied fix",
      "user",
    );

    expect(second.timeline.length).toBe(2);
    expect(second.timeline[0]?.to).toBe("investigating");
    expect(second.timeline[1]?.from).toBe("investigating");
    expect(second.timeline[1]?.to).toBe("mitigated");
  });

  it("does not mutate the original incident", () => {
    const incident = createIncident();
    const originalState = incident.currentState;
    const originalTimelineLength = incident.timeline.length;

    transitionIncident(incident, "investigating", "reason", "system");

    expect(incident.currentState).toBe(originalState);
    expect(incident.timeline.length).toBe(originalTimelineLength);
  });

  it("handles system triggered transitions", () => {
    const incident = createIncident();

    const updated = transitionIncident(
      incident,
      "investigating",
      "Auto-detected",
      "system",
    );

    expect(updated.timeline[0]?.triggeredBy).toBe("system");
  });

  it("handles user triggered transitions", () => {
    const incident = createIncident();

    const updated = transitionIncident(
      incident,
      "resolved",
      "Manual resolution",
      "user",
    );

    expect(updated.timeline[0]?.triggeredBy).toBe("user");
  });
});
