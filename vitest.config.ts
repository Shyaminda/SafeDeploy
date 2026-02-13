import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["control-plane/src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["control-plane/src/**/*.ts"],
    },
  },
});
