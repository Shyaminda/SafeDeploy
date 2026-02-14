import { describe, it, expect } from "vitest";

describe("incident deduplication", () => {
  it("detects existing active incident", () => {
    const incidents = [
      {
        id: "i1",
        service: "demo-app",
        currentState: "investigating",
      },
    ];

    const active = incidents.find(
      (i) =>
        i.service === "demo-app" &&
        !["resolved", "postmortem-complete"].includes(i.currentState),
    );

    expect(active).toBeDefined();
  });
});
