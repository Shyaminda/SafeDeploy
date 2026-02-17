import { describe, it, expect } from "vitest";

// Helper to find active incident (matches deduplication logic)
function findActiveIncident(
  incidents: Array<{ id: string; service: string; currentState: string }>,
  serviceName: string,
) {
  return incidents.find(
    (i) =>
      i.service === serviceName &&
      !["resolved", "postmortem-complete"].includes(i.currentState),
  );
}

describe("incident deduplication", () => {
  it("detects existing active incident in investigating state", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "investigating",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeDefined();
    expect(active?.id).toBe("i1");
  });

  it("detects existing active incident in detected state", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "detected",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeDefined();
  });

  it("detects existing active incident in mitigated state", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "mitigated",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeDefined();
  });

  it("does not return resolved incident as active", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "resolved",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeUndefined();
  });

  it("does not return postmortem-complete incident as active", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "postmortem-complete",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeUndefined();
  });

  it("returns undefined for different service", () => {
    const incidents = [
      {
        id: "i1",
        service: "other-app",
        currentState: "investigating",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeUndefined();
  });

  it("returns undefined for empty incidents array", () => {
    const incidents: Array<{ id: string; service: string; currentState: string }> = [];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeUndefined();
  });

  it("finds active incident among mixed states", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "resolved",
      },
      {
        id: "i2",
        service: "demo-app",
        currentState: "investigating",
      },
    ];

    const active = findActiveIncident(incidents, "demo-app");

    expect(active).toBeDefined();
    expect(active?.id).toBe("i2");
  });
});
