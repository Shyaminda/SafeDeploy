import fs from "fs";
import path from "path";
import { afterAll, beforeAll } from "vitest";

const TEST_ARTIFACTS_DIRS = ["action-proposals", "evidence"];

function getTestArtifactPaths(): string[] {
  return TEST_ARTIFACTS_DIRS.map((dir) => path.join(process.cwd(), dir));
}

function getExistingFiles(dir: string): Set<string> {
  if (!fs.existsSync(dir)) return new Set();
  return new Set(fs.readdirSync(dir));
}

const existingFilesBefore: Map<string, Set<string>> = new Map();

beforeAll(() => {
  // Capture existing files before tests run
  for (const dir of getTestArtifactPaths()) {
    existingFilesBefore.set(dir, getExistingFiles(dir));
  }
});

afterAll(() => {
  // Clean up files created during tests
  for (const dir of getTestArtifactPaths()) {
    if (!fs.existsSync(dir)) continue;

    const existingBefore = existingFilesBefore.get(dir) || new Set();
    const currentFiles = fs.readdirSync(dir);

    for (const file of currentFiles) {
      if (!existingBefore.has(file)) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
          } else {
            fs.unlinkSync(filePath);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
});
