import fs from "fs";
import path from "path";

const BASE = path.join(process.cwd(), "control-plane", "audit");

export function writeAudit(
  domain: string,
  fileName: string,
  payload: unknown,
): void {
  const dir = path.join(BASE, domain);
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, fileName);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}
