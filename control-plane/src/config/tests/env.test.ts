import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("env schema", () => {
  it("fails if PROM_URL is not a valid URL", () => {
    const Schema = z.object({
      PROM_URL: z.url(),
    });

    expect(() => Schema.parse({ PROM_URL: "not-a-url" })).toThrow();
  });
});
