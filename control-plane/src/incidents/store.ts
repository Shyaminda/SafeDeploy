import fs from "fs";
import path from "path";
import type { Incident } from "./incident.js";

const BASE = path.join(process.cwd(), "incidents");

export function saveIncident(incident: Incident) {
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(
    path.join(BASE, `${incident.id}.json`),
    JSON.stringify(incident, null, 2)
  );
}
