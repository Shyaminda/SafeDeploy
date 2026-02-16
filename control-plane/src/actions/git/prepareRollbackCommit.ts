import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import { ensureEnvRepo } from "./repoManager.js";
import { config } from "../../config/index.js";

export async function prepareRollbackCommit(
  imageTag: string,
  branchName: string,
): Promise<void> {
  const repoPath = await ensureEnvRepo();
  const git = simpleGit(repoPath);

  const baseBranch = config.github.baseBranch!;

  await git.checkout(baseBranch);
  await git.pull("origin", baseBranch);

  await git.checkoutLocalBranch(branchName);

  const rolloutPath = path.join(repoPath, "apps/demo-app/rollout.yaml");

  const content = fs.readFileSync(rolloutPath, "utf-8");

  const updated = content.replace(
    /image:\s*ghcr\.io\/shyaminda\/demo-app:.*/,
    `image: ghcr.io/shyaminda/demo-app:${imageTag}`,
  );

  fs.writeFileSync(rolloutPath, updated);

  await git.add(rolloutPath);
  await git.commit(`Rollback to image ${imageTag}`);
  await git.push("origin", branchName);
}
