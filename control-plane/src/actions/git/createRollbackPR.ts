import axios from "axios";
import dotenv from "dotenv";
import { config } from "../../config/index.js";

dotenv.config();

export async function createRollbackPR(
  branchName: string,
  commitMessage: string,
  prTitle: string,
  prBody: string,
) {
  if (!config.github.PR_Token) {
    throw new Error("Missing GITHUB_TOKEN");
  }

  const client = axios.create({
    baseURL: `https://api.github.com/repos/${config.github.owner}/${config.github.repo}`,
    headers: {
      Authorization: `Bearer ${config.github.PR_Token}`,
      Accept: "application/vnd.github+json",
    },
  });

  const response = await client.post("/pulls", {
    title: prTitle,
    head: branchName,
    base: config.github.baseBranch,
    body: prBody,
  });

  return response.data.html_url;
}
