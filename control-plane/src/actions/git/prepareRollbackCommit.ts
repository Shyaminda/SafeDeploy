import fs from "fs";
import { simpleGit } from "simple-git";

export async function prepareRollbackCommit(
  repoPath: string,
  imageTag: string,
  branchName: string,
) {
  const git = simpleGit(repoPath);

  await git.checkoutLocalBranch(branchName);

  const rolloutPath = `${repoPath}/apps/demo-app/rollout.yaml`;

  const content = fs.readFileSync(rolloutPath, "utf-8");

  const updated = content.replace(
    /image:\s*ghcr\.io\/shyaminda\/demo-app:.*/,
    `image: ghcr.io/shyaminda/demo-app:${imageTag}`,
  );

  fs.writeFileSync(rolloutPath, updated);

  await git.add(".");
  await git.commit(`Rollback to image ${imageTag}`);
  await git.push("origin", branchName);
}
