import { describe, it, expect } from "vitest";
import { loadConfig } from "../env.js";

describe("loadConfig", () => {
  it("builds config correctly", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
    } as any);

    expect(config.prometheus.url).toBe("http://localhost:9090");
    expect(config.runtime.env).toBe("development");
  });

  it("throws on invalid URL", () => {
    expect(() => loadConfig({ PROM_URL: "bad-url" } as any)).toThrow();
  });
});
