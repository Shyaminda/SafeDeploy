import fs from "fs";
import path from "path";

function ensureIncidentFolder(incidentId: string): string {
  const base = path.resolve("evidence", incidentId);
  fs.mkdirSync(base, { recursive: true });
  return base;
}

export function saveEvidence(
  incidentId: string,
  filename: string,
  data: unknown,
): void {
  const folder = ensureIncidentFolder(incidentId);

  const filePath = path.join(folder, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
