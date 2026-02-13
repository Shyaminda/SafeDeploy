import fs from "fs";
import path from "path";
import type { ActionProposal } from "./proposal.js";

const BASE = path.join(process.cwd(), "action-proposals");

export function saveProposal(proposal: ActionProposal) {
  fs.mkdirSync(BASE, { recursive: true });

  fs.writeFileSync(
    path.join(BASE, `${proposal.id}.json`),
    JSON.stringify(proposal, null, 2),
  );
}
