import { describe, it, expect } from "vitest";
import { loadConfig } from "../env.js";

describe("loadConfig", () => {
  it("builds config correctly with defaults", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
    } as any);

    expect(config.prometheus.url).toBe("http://localhost:9090");
    expect(config.runtime.env).toBe("development");
    expect(config.runtime.isDevelopment).toBe(true);
    expect(config.runtime.isProduction).toBe(false);
    expect(config.runtime.isTest).toBe(false);
    expect(config.logging.level).toBe("info");
  });

  it("throws on invalid URL", () => {
    expect(() => loadConfig({ PROM_URL: "bad-url" } as any)).toThrow();
  });

  it("throws when PROM_URL is missing", () => {
    expect(() => loadConfig({} as any)).toThrow();
  });

  it("sets runtime flags correctly for production", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
      NODE_ENV: "production",
    } as any);

    expect(config.runtime.env).toBe("production");
    expect(config.runtime.isProduction).toBe(true);
    expect(config.runtime.isDevelopment).toBe(false);
    expect(config.runtime.isTest).toBe(false);
  });

  it("sets runtime flags correctly for test", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
      NODE_ENV: "test",
    } as any);

    expect(config.runtime.env).toBe("test");
    expect(config.runtime.isTest).toBe(true);
    expect(config.runtime.isProduction).toBe(false);
    expect(config.runtime.isDevelopment).toBe(false);
  });

  it("uses custom LOG_LEVEL when provided", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
      LOG_LEVEL: "debug",
    } as any);

    expect(config.logging.level).toBe("debug");
  });

  it("throws on invalid NODE_ENV", () => {
    expect(() =>
      loadConfig({
        PROM_URL: "http://localhost:9090",
        NODE_ENV: "invalid",
      } as any),
    ).toThrow();
  });

  it("throws on invalid LOG_LEVEL", () => {
    expect(() =>
      loadConfig({
        PROM_URL: "http://localhost:9090",
        LOG_LEVEL: "invalid",
      } as any),
    ).toThrow();
  });

  it("parses github config when provided", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
      GITHUB_TOKEN_PR_SE: "token123",
      GITHUB_OWNER: "owner",
      GITHUB_REPO: "repo",
      GITHUB_BASE_BRANCH: "main",
      GITHUB_REPO_URL: "https://github.com/owner/repo",
      GITHUB_REPO_PATH: "/path/to/repo",
    } as any);

    expect(config.github.PR_Token).toBe("token123");
    expect(config.github.owner).toBe("owner");
    expect(config.github.repo).toBe("repo");
    expect(config.github.baseBranch).toBe("main");
    expect(config.github.repoUrl).toBe("https://github.com/owner/repo");
    expect(config.github.repoPath).toBe("/path/to/repo");
  });

  it("sets github config to undefined when not provided", () => {
    const config = loadConfig({
      PROM_URL: "http://localhost:9090",
    } as any);

    expect(config.github.PR_Token).toBeUndefined();
    expect(config.github.owner).toBeUndefined();
    expect(config.github.repo).toBeUndefined();
    expect(config.github.baseBranch).toBeUndefined();
    expect(config.github.repoUrl).toBeUndefined();
    expect(config.github.repoPath).toBeUndefined();
  });
});
