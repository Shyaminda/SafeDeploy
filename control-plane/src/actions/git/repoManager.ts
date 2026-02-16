import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import { config } from "../../config/index.js";

export async function ensureEnvRepo(): Promise<string> {
  const repoPath = path.resolve(config.github.repoPath!);
  const repoUrl = config.github.repoUrl!;

  if (!repoUrl) {
    throw new Error("ENV_REPO_URL not configured");
  }

  if (!fs.existsSync(repoPath)) {
    console.log("Cloning environment repository...");
    await simpleGit().clone(repoUrl, repoPath);
  }

  return repoPath;
}
