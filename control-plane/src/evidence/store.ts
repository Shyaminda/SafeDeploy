import fs from "fs";
import path from "path";

const BASE = path.resolve("evidence");

function getEvidenceBase(incidentId: string): string {
  if (incidentId.startsWith("incident-policy-")) {
    return path.join(BASE, "policy-incidents");
  }

  return path.join(BASE, "incidents");
}

function ensureIncidentFolder(incidentId: string): string {
  const base = getEvidenceBase(incidentId);

  const folder = path.join(base, incidentId);

  fs.mkdirSync(folder, { recursive: true });

  return folder;
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
