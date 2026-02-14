import { describe, it, expect } from "vitest";
import { explainBurnDecision } from "../explain.js";

describe("explainBurnDecision (strict contract)", () => {
  it("returns exact message for fast-burn", () => {
    expect(explainBurnDecision("fast-burn")).toBe(
      "Error budget is being consumed at a critical rate; immediate user impact likely.",
    );
  });

  it("returns exact message for slow-burn", () => {
    expect(explainBurnDecision("slow-burn")).toBe(
      "Error budget consumption exceeds sustainable rate; monitor closely.",
    );
  });

  it("returns exact message for exhausted", () => {
    expect(explainBurnDecision("exhausted")).toBe(
      "Error budget exhausted; service is operating outside SLO.",
    );
  });

  it("returns exact message for normal/default case", () => {
    expect(explainBurnDecision("normal" as any)).toBe(
      "Service operating within SLO.",
    );
  });
});
