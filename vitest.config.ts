import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["control-plane/src/**/*.test.ts"],
    setupFiles: ["control-plane/src/helper/testCleanUp.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["control-plane/src/**/*.ts"],
      exclude: [
        "**/incident.ts",
        "**/proposal.ts",
        "**/index.ts",
        "**/store.ts",
        "**/observability/prometheus.ts", // Infrastructure adapter - external API
        "**/actions/git/**", // Git/GitHub integration - test via integration tests
        "**/manualProposalApproval.ts", // CLI entry point
      ],

      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
});
